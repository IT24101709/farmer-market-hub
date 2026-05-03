const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const { CATEGORY_ENUM } = require('../utils/stockCategory');
const StockHistory = require('../models/StockHistory');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { expiryFromHarvest, attachSpoilageMeta } = require('../utils/shelfLife');

const syncAvailabilityFields = (stock) => {
  const quantity = Number(stock.quantity || 0);

  if (quantity === 0) {
    stock.status = 'Out of Stock';
    stock.availabilityStatus = false;
    stock.visibility = false;
    return;
  }

  const isAvailable = stock.status === 'Available';
  stock.availabilityStatus = isAvailable;
  stock.visibility = isAvailable;
};

// Design decision for zero quantity:
// Stock records are retained for audit/reporting, but are marked unavailable and hidden from public listings.
// Manual DELETE remains available for farmers who want to remove their own stock entry.

// @desc    Get all available stocks with filters
// @route   GET /api/stocks
// @access  Private
exports.getAvailableStocks = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, farmerId, sort = 'newest' } = req.query;

    const filter = {
      availabilityStatus: true,
      isDeleted: false
    };

    if (category) {
      const c = String(category).toLowerCase().trim();
      if (CATEGORY_ENUM.includes(c)) {
        filter.category = c;
      } else if (mongoose.Types.ObjectId.isValid(category)) {
        filter.categoryId = category;
      }
    }
    if (farmerId) filter.farmerId = farmerId;
    if (search) filter.name = { $regex: search, $options: 'i' };

    if (minPrice || maxPrice) {
      filter.pricePerKg = {};
      if (minPrice) filter.pricePerKg.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerKg.$lte = Number(maxPrice);
    }

    const sortMap = {
      newest: { createdAt: -1 },
      name: { name: 1, createdAt: -1 },
      priceAsc: { pricePerKg: 1, createdAt: -1 },
      priceDesc: { pricePerKg: -1, createdAt: -1 },
      qtyDesc: { quantity: -1, createdAt: -1 }
    };
    const sortSpec = sortMap[String(sort)] || sortMap.newest;

    const stocks = await Stock.find(filter)
      .populate('farmerId', 'name email profileDetails')
      .populate('categoryId', 'name')
      .sort(sortSpec)
      .lean();

    res.status(200).json(stocks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create new stock
// @route   POST /api/stocks
// @access  Private (Farmer only)
exports.createStock = async (req, res) => {
  try {
    // Validation middleware already ran, use req.validatedData
    const { name, category, unit, harvestDate, quantity, pricePerKg, expiryDate, categoryId, qualityGrade, status, description } = req.validatedData || req.body;
    const { minPriceLimit, maxPriceLimit } = req.stockLimits || {};

    if (!req.file) {
      return res.status(400).json({ message: '❌ Image is required' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const resolvedExpiry = expiryDate
      ? new Date(expiryDate)
      : expiryFromHarvest(harvestDate, category, name);

    const newStock = new Stock({
      farmerId: req.user.id,
      // New fields
      name,
      category,
      unit: unit || 'kg',
      description: description || '',
      // Legacy/backward compatibility
      categoryId: categoryId || undefined,
      harvestDate,
      quantity,
      pricePerKg,
      qualityGrade: qualityGrade || 'A',
      minPriceLimit: minPriceLimit || 0,
      maxPriceLimit: maxPriceLimit || Infinity,
      expiryDate: resolvedExpiry,
      imageUrl,
      status: status || 'Available',
      approvalStatus: 'Approved',
      // Auto-calculate based on quantity (pre-save hook will also handle this)
      availabilityStatus: status === 'Available' && Number(quantity) > 0,
      visibility: status === 'Available' && Number(quantity) > 0
    });

    const savedStock = await newStock.save();

    // Audit log with IP/userAgent (from middleware or req)
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user.id,
      stockId: savedStock._id,
      action: 'STOCK_CREATED',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      details: { name, category, quantity, pricePerKg: `₹${pricePerKg}` }
    });

    res.status(201).json({
      message: `✅ Stock for ${name} created successfully. It is listed on the marketplace for customers.`,
      stock: attachSpoilageMeta(savedStock.toObject(), new Date())
    });
  } catch (error) {
    console.error('Create stock error:', error);
    if (error.code === 11000) {
      const duplicateFields = Object.keys(error.keyPattern || {});
      const friendly = duplicateFields.length ? duplicateFields.join(', ') : 'a unique field';
      return res.status(400).json({
        message: `Duplicate value for ${friendly}. Change the conflicting field and try again.`
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all stocks for logged-in farmer with pagination (exclude deleted)
// @route   GET /api/stocks/my
// @access  Private
exports.getMyStocks = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, lowStock, sort = 'newest' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let query = { 
      farmerId: req.user.id, 
      isDeleted: false 
    };

    if (status) query.status = status;
    if (lowStock === 'true') query.quantity = { $lt: 10 };

    const sortMap = {
      newest: { createdAt: -1 },
      name: { name: 1, createdAt: -1 },
      priceAsc: { pricePerKg: 1, createdAt: -1 },
      priceDesc: { pricePerKg: -1, createdAt: -1 },
      qtyDesc: { quantity: -1, createdAt: -1 }
    };
    const sortSpec = sortMap[String(sort)] || sortMap.newest;

    const [stocks, total] = await Promise.all([
      Stock.find(query)
        .populate('categoryId', 'name')
        .sort(sortSpec)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Stock.countDocuments(query)
    ]);

    const now = new Date();
    const stocksWithMeta = stocks.map((s) => attachSpoilageMeta(s, now));

    res.status(200).json({
      stocks: stocksWithMeta,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get a single stock by ID
// @route   GET /api/stocks/:id
// @access  Private
exports.getStockById = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);

    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    // Check if it belongs to farmer
    if (stock.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: only the owning farmer can access this stock record.' });
    }

    const payload = attachSpoilageMeta(stock.toObject ? stock.toObject() : stock, new Date());
    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update stock
// @route   PUT /api/stocks/:id
// @access  Private
exports.updateStock = async (req, res) => {
  try {
    // Validation middleware already ran for changed fields
    const validatedData = req.validatedData;
    const changedFields = {};

    let stock = await Stock.findById(req.params.id).populate('categoryId');

    if (!stock) {
      return res.status(404).json({ message: '❌ Stock not found' });
    }

    if (stock.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: only the owning farmer can update this stock record.' });
    }

    if (stock.isDeleted) {
      return res.status(400).json({ message: '❌ Cannot update deleted stock. Use admin restore.' });
    }

// Apply validated updates
    if (validatedData) {
      if (validatedData.name !== undefined) stock.name = validatedData.name;
      if (validatedData.category !== undefined) stock.category = validatedData.category;
      if (validatedData.unit !== undefined) stock.unit = validatedData.unit;
      if (validatedData.description !== undefined) stock.description = validatedData.description;
      if (validatedData.harvestDate !== undefined) stock.harvestDate = validatedData.harvestDate;
      if (validatedData.quantity !== undefined) {
        changedFields.oldQuantity = stock.quantity;
        stock.quantity = validatedData.quantity;
        changedFields.newQuantity = validatedData.quantity;
      }
      if (validatedData.pricePerKg !== undefined) {
        changedFields.oldPrice = stock.pricePerKg;
        stock.pricePerKg = Number(validatedData.pricePerKg.toFixed(2));
        changedFields.newPrice = stock.pricePerKg;
      }
      if (validatedData.qualityGrade !== undefined) stock.qualityGrade = validatedData.qualityGrade;
      if (req.stockLimits) {
        stock.minPriceLimit = req.stockLimits.minPriceLimit;
        stock.maxPriceLimit = req.stockLimits.maxPriceLimit;
      }
    }

    // Other fields
    const { expiryDate, status } = req.body;
    if (expiryDate !== undefined) {
      stock.expiryDate = new Date(expiryDate);
    }
    if (status !== undefined) {
      stock.status = status;
    }

    // Auto logic
    const now = new Date();
    if (stock.expiryDate < now) {
      stock.status = 'Expired';
      stock.visibility = false;
    }
syncAvailabilityFields(stock);

    let newImageUrl = stock.imageUrl;
    if (req.file) {
      newImageUrl = `/uploads/${req.file.filename}`;
      if (stock.imageUrl && stock.imageUrl !== newImageUrl) {
        const fs = require('fs');
        const path = require('path');
        const relImg = String(stock.imageUrl || '').replace(/^[/\\]+/, '');
        const filePath = path.join(__dirname, '..', '..', relImg);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
    stock.imageUrl = newImageUrl;

    const oldStatus = stock.status;

    // Auto-delete if quantity is zero
    if (stock.quantity === 0) {
      // Image cleanup
      if (stock.imageUrl) {
        const fs = require('fs');
        const path = require('path');
        const relImg = String(stock.imageUrl || '').replace(/^[/\\]+/, '');
        const filePath = path.join(__dirname, '..', '..', relImg);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch(e) {}
        }
      }

      await Stock.findByIdAndDelete(stock._id);
      
      // Audit log
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        userId: req.user.id,
        stockId: stock._id,
        action: 'STOCK_AUTO_DELETED',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        details: { name: stock.name, reason: 'Quantity reached zero' }
      });

      return res.status(200).json({ 
        message: `✅ Stock for ${stock.name} quantity reached zero and was auto-deleted.`,
        stock: null 
      });
    }

    const updatedStock = await stock.save();
    changedFields.newStatus = updatedStock.status;

    // Audit log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user.id,
      stockId: updatedStock._id,
      action: 'STOCK_UPDATED',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      details: changedFields
    });

    res.status(200).json({ 
      message: `✅ Stock for ${updatedStock.name} updated from ${changedFields.oldQuantity || '?'} kg to ${updatedStock.quantity} kg.`,
      stock: updatedStock 
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete stock (farmer manual delete, hard delete if qty=0)
// @route   DELETE /api/stocks/:id
// @access  Private
exports.deleteStock = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);

    if (!stock) {
      return res.status(404).json({ message: '❌ Stock not found' });
    }

    if (stock.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: only the owning farmer can delete this stock record.' });
    }

    if (stock.isDeleted) {
      return res.status(400).json({ message: '❌ Already deleted' });
    }

// Image cleanup
    if (stock.imageUrl) {
      const fs = require('fs');
      const path = require('path');
      const relImg = String(stock.imageUrl || '').replace(/^[/\\]+/, '');
      const filePath = path.join(__dirname, '..', '..', relImg);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Stock.findByIdAndDelete(stock._id);

    // Audit
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user.id,
      stockId: stock._id,
      action: 'STOCK_DELETED_FARMER',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      details: { name: stock.name, reason: 'Farmer manual removal' }
    });

    res.status(200).json({ message: `✅ Stock for ${stock.name} removed successfully.` });
  } catch (error) {
    console.error('Delete stock error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Toggle visibility (list/unlist from marketplace)
// @route   PATCH /api/stocks/:id/visibility
// @access  Private (Farmer only)
exports.toggleVisibility = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);

    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    if (stock.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: only the owning farmer can update visibility.' });
    }

    if (!stock.visibility && stock.approvalStatus === 'Rejected') {
      return res.status(400).json({
        message: 'Rejected listings cannot be shown on the marketplace.'
      });
    }

    stock.visibility = !stock.visibility;
    await stock.save();

    res.status(200).json({
      message: stock.visibility ? 'Stock listed on marketplace' : 'Stock unlisted from marketplace',
      visibility: stock.visibility,
      stock
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update stock availability status (Available / Out of Stock)
// @route   PATCH /api/stocks/:id/status
// @access  Private (Farmer only)
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['Available', 'Out of Stock'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${allowedStatuses.join(', ')}`
      });
    }

    const stock = await Stock.findById(req.params.id);

    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    if (stock.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: only the owning farmer can update status.' });
    }

    stock.status = status;
    syncAvailabilityFields(stock);
    await stock.save();

    res.status(200).json({ message: `Status updated to ${status}`, stock });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update stock quantity
// @route   PATCH /api/stocks/:id/quantity
// @access  Private (owning farmer only)
exports.updateQuantity = async (req, res) => {
  try {
    const quantity = Number(req.body.quantity);

    if (!Number.isFinite(quantity) || quantity < 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number or zero.' });
    }

    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).json({ message: 'Stock not found' });

    if (stock.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: only the owning farmer can update quantity.' });
    }

    stock.quantity = quantity;
    syncAvailabilityFields(stock);

    if (stock.quantity === 0) {
      // Image cleanup
      if (stock.imageUrl) {
        const fs = require('fs');
        const path = require('path');
        const relImg = String(stock.imageUrl || '').replace(/^[/\\]+/, '');
        const filePath = path.join(__dirname, '..', '..', relImg);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch(e) {}
        }
      }

      await Stock.findByIdAndDelete(stock._id);
      
      // Audit log
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        userId: req.user.id,
        stockId: stock._id,
        action: 'STOCK_AUTO_DELETED',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        details: { name: stock.name, reason: 'Quantity reached zero via quick update' }
      });

      return res.status(200).json({
        message: 'Quantity updated to zero. Stock auto-deleted.',
        stock: null
      });
    }

    const updatedStock = await stock.save();
    res.status(200).json({
      message: quantity === 0
        ? 'Quantity updated to zero. Stock retained and marked unavailable.'
        : 'Quantity updated successfully.',
      stock: updatedStock
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update stock price independently
// @route   PATCH /api/stocks/:id/price
// @access  Private (owning farmer only)
exports.updatePrice = async (req, res) => {
  try {
    const price = Number(req.body.pricePerKg);

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0.' });
    }

    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).json({ message: 'Stock not found' });

    if (stock.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: only the owning farmer can update price.' });
    }

    stock.pricePerKg = Number(price.toFixed(2));
    const updatedStock = await stock.save();
    res.status(200).json(updatedStock);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update stock availability status
// @route   PATCH /api/stocks/:id/availability
// @access  Private (owning farmer only)
exports.updateAvailability = async (req, res) => {
  try {
    const { availabilityStatus } = req.body;

    if (typeof availabilityStatus !== 'boolean') {
      return res.status(400).json({ message: 'availabilityStatus must be true or false.' });
    }

    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).json({ message: 'Stock not found' });

    if (stock.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: only the owning farmer can update availability.' });
    }

    stock.status = availabilityStatus && stock.quantity > 0 ? 'Available' : 'Out of Stock';
    syncAvailabilityFields(stock);

    const updatedStock = await stock.save();
    res.status(200).json(updatedStock);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Remove all expired stock for the logged-in farmer
// @route   DELETE /api/stocks/expired
// @access  Private (Farmer only)
exports.removeExpiredStock = async (req, res) => {
  try {
    const now = new Date();

    // First auto-mark anything past expiry as Expired
    await Stock.updateMany(
      { farmerId: req.user.id, expiryDate: { $lt: now }, status: { $ne: 'Expired' } },
      { $set: { status: 'Expired', visibility: false } }
    );

    // Delete all expired records for this farmer
    const result = await Stock.deleteMany({
      farmerId: req.user.id,
      status: 'Expired'
    });

    res.status(200).json({
      message: `Removed ${result.deletedCount} expired stock item(s)`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Bulk add stocks
// @route   POST /api/stocks/bulk
// @access  Private (Farmer only)
exports.bulkAddStocks = async (req, res) => {
  try {
    // Expects an array of stock objects in req.body.stocks
    const { stocks } = req.body;
    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of stocks' });
    }

    const farmerId = req.user.id;
    const farmer = await User.findById(farmerId);
    if (farmer && farmer.status === 'Suspended') {
      return res.status(403).json({ message: '❌ Your account is suspended. Contact admin.' });
    }

const stocksToInsert = stocks.map((stock) => {
      const harvest = stock.harvestDate ? new Date(stock.harvestDate) : new Date();
      const category = stock.category || 'other';
      const name = stock.name || 'Item';
      const exp = stock.expiryDate
        ? new Date(stock.expiryDate)
        : expiryFromHarvest(harvest, category, name);

      return {
        farmerId,
        name,
        category,
        unit: stock.unit || 'kg',
        description: stock.description || '',
        categoryId: stock.categoryId || undefined,
        harvestDate: harvest,
        quantity: stock.quantity,
        pricePerKg: stock.pricePerKg,
        expiryDate: exp,
        imageUrl: stock.imageUrl || stock.image || '/uploads/default-veg.png',
        qualityGrade: stock.qualityGrade || 'A',
        status: 'Available',
        approvalStatus: 'Approved',
        visibility: true,
        availabilityStatus: true
      };
    });

    const insertedStocks = await Stock.insertMany(stocksToInsert);
    res.status(201).json({ message: `Successfully added ${insertedStocks.length} items`, insertedStocks });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Bulk update stocks
// @route   PUT /api/stocks/bulk
// @access  Private (Farmer only)
exports.bulkUpdateStocks = async (req, res) => {
  try {
    // Expects an array of objects: { _id, quantity, pricePerKg, ... }
    const { stocks } = req.body;
    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of stocks to update' });
    }

    const farmerId = req.user.id;
    let updatedCount = 0;

    // Use a loop to update each document. For larger datasets, bulkWrite is better.
    for (let stock of stocks) {
      if (!stock._id) continue;

      const existingStock = await Stock.findOne({ _id: stock._id, farmerId });
      if (existingStock) {
        if (stock.quantity !== undefined) existingStock.quantity = stock.quantity;
        if (stock.pricePerKg !== undefined) existingStock.pricePerKg = stock.pricePerKg;
        if (stock.status !== undefined) existingStock.status = stock.status;

        // Auto-remove if quantity <= 0
        if (existingStock.quantity <= 0) {
          // Image cleanup
          if (existingStock.imageUrl) {
            const fs = require('fs');
            const path = require('path');
            const relImg = String(existingStock.imageUrl || '').replace(/^[/\\]+/, '');
            const filePath = path.join(__dirname, '..', '..', relImg);
            if (fs.existsSync(filePath)) {
              try { fs.unlinkSync(filePath); } catch(e) {}
            }
          }
          await Stock.findByIdAndDelete(existingStock._id);
        } else {
          await existingStock.save();
        }
        updatedCount++;
      }
    }

    res.status(200).json({ message: `Successfully updated ${updatedCount} items` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
