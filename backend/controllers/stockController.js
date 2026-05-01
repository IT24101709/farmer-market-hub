const Stock = require('../models/Stock');
const StockHistory = require('../models/StockHistory');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// @desc    Create new stock
// @route   POST /api/stocks
// @access  Private (Farmer only)
exports.createStock = async (req, res) => {
  try {
    // Validation middleware already ran, use req.validatedData
    const { vegetableName, harvestDate, quantity, pricePerKg, expiryDate, categoryId } = req.validatedData || req.body;
    const { minPriceLimit, maxPriceLimit } = req.stockLimits || {};

    if (!req.file) {
      return res.status(400).json({ message: '❌ Image is required' });
    }

    const imagePath = `/uploads/${req.file.filename}`;

    const newStock = new Stock({
      farmerId: req.user.id,
      categoryId: categoryId || undefined,
      vegetableName,
      harvestDate,
      quantity,
      pricePerKg,
      minPriceLimit: minPriceLimit || 0,
      maxPriceLimit: maxPriceLimit || Infinity,
      expiryDate: new Date(expiryDate),
      image: imagePath,
status: 'Available'  // Auto-listed for demo
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
      details: { vegetableName, quantity, pricePerKg: `₹${pricePerKg}` }
    });

    res.status(201).json({ 
      message: `✅ Stock for ${vegetableName} created successfully. Awaiting admin approval.`,
      stock: savedStock 
    });
  } catch (error) {
    console.error('Create stock error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all stocks for logged-in farmer with pagination (exclude deleted)
// @route   GET /api/stocks/my
// @access  Private
exports.getMyStocks = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, lowStock } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let query = { 
      farmerId: req.user.id, 
      isDeleted: false 
    };

    if (status) query.status = status;
    if (lowStock === 'true') query.quantity = { $lt: 10 };

    const [stocks, total] = await Promise.all([
      Stock.find(query)
        .populate('categoryId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Stock.countDocuments(query)
    ]);

    res.status(200).json({
      stocks,
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
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.status(200).json(stock);
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
      return res.status(401).json({ message: '❌ Not authorized' });
    }

    if (stock.isDeleted) {
      return res.status(400).json({ message: '❌ Cannot update deleted stock. Use admin restore.' });
    }

    // Apply validated updates
    if (validatedData) {
      if (validatedData.vegetableName !== undefined) stock.vegetableName = validatedData.vegetableName;
      if (validatedData.harvestDate !== undefined) stock.harvestDate = validatedData.harvestDate;
      if (validatedData.quantity !== undefined) {
        stock.quantity = validatedData.quantity;
        changedFields.oldQuantity = stock.quantity;
        changedFields.newQuantity = validatedData.quantity;
      }
      if (validatedData.pricePerKg !== undefined) {
        stock.pricePerKg = validatedData.pricePerKg;
        changedFields.oldPrice = stock.pricePerKg;
        changedFields.newPrice = validatedData.pricePerKg;
      }
      if (req.stockLimits) {
        stock.minPriceLimit = req.stockLimits.minPriceLimit;
        stock.maxPriceLimit = req.stockLimits.maxPriceLimit;
      }
    }

    // Other fields
    const { expiryDate, status, visibility } = req.body;
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
    if (stock.quantity === 0) {
      stock.status = 'Out of Stock';
      stock.visibility = false;
    } else if (stock.quantity < 10) {
      stock.status = 'Low Stock';
    }

    let newImage = stock.image;
    if (req.file) {
      newImage = `/uploads/${req.file.filename}`;
      if (stock.image && stock.image !== newImage) {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, '..', stock.image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
    stock.image = newImage;

    const oldStatus = stock.status;
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
      message: `✅ Stock for ${updatedStock.vegetableName} updated from ${changedFields.oldQuantity || '?'} kg to ${updatedStock.quantity} kg.`,
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
      return res.status(401).json({ message: '❌ Not authorized' });
    }

    if (stock.isDeleted) {
      return res.status(400).json({ message: '❌ Already deleted' });
    }

    // Image cleanup
    if (stock.image) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '..', stock.image);
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
      details: { vegetableName: stock.vegetableName, reason: 'Farmer manual removal' }
    });

    res.status(200).json({ message: `✅ Stock for ${stock.vegetableName} removed successfully.` });
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
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Cannot make visible if not approved yet
    if (!stock.visibility && stock.approvalStatus !== 'Approved') {
      return res.status(400).json({
        message: 'Stock must be approved by admin before it can be listed on the marketplace'
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
      return res.status(401).json({ message: 'Not authorized' });
    }

    stock.status = status;
    await stock.save();

    res.status(200).json({ message: `Status updated to ${status}`, stock });
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

    const stocksToInsert = stocks.map(stock => ({
      farmerId,
      categoryId: stock.categoryId || undefined,
      vegetableName: stock.vegetableName,
      quantity: stock.quantity,
      pricePerKg: stock.pricePerKg,
      expiryDate: stock.expiryDate,
      image: stock.image || '/uploads/default-veg.png', // Default image placeholder
      status: 'Available'
    }));

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

