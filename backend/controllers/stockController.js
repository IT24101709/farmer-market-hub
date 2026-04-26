const Stock = require('../models/Stock');
const fs = require('fs');
const path = require('path');

// @desc    Create new stock
// @route   POST /api/stocks
// @access  Private (Farmer only)
exports.createStock = async (req, res) => {
  try {
    const { vegetableName, quantity, pricePerKg, expiryDate } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    const imagePath = `/uploads/${req.file.filename}`;

    const newStock = new Stock({
      farmerId: req.user.id, // Assuming authMiddleware sets req.user
      vegetableName,
      quantity,
      pricePerKg,
      expiryDate,
      image: imagePath
    });

    const savedStock = await newStock.save();
    res.status(201).json(savedStock);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all stocks for logged-in farmer
// @route   GET /api/stocks/my
// @access  Private
exports.getMyStocks = async (req, res) => {
  try {
    const stocks = await Stock.find({ farmerId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(stocks);
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
    const { vegetableName, quantity, pricePerKg, expiryDate, status } = req.body;

    let stock = await Stock.findById(req.params.id);

    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    // Check if it belongs to farmer
    if (stock.farmerId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Assignment requirement: removes stock records when quantity reaches zero
    if (quantity !== undefined && Number(quantity) <= 0) {
      // Delete the image file if possible
      if (stock.image) {
        const filePath = path.join(__dirname, '..', stock.image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      await Stock.findByIdAndDelete(req.params.id);
      return res.status(200).json({ message: 'Stock removed automatically as quantity reached zero', removed: true });
    }

    let updatedStatus = status || stock.status;
    let expDate = expiryDate ? new Date(expiryDate) : stock.expiryDate;

    // Auto set status = "Expired" if expiryDate < today
    if (expDate < new Date()) {
      updatedStatus = 'Expired';
    }

    let newImage = stock.image;
    if (req.file) {
      newImage = `/uploads/${req.file.filename}`;
      // Remove old image
      if (stock.image) {
        const filePath = path.join(__dirname, '..', stock.image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    stock.vegetableName = vegetableName || stock.vegetableName;
    stock.quantity = quantity || stock.quantity;
    stock.pricePerKg = pricePerKg || stock.pricePerKg;
    stock.expiryDate = expDate;
    stock.status = updatedStatus;
    stock.image = newImage;

    const updatedStock = await stock.save();
    res.status(200).json(updatedStock);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete stock
// @route   DELETE /api/stocks/:id
// @access  Private
exports.deleteStock = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);

    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    if (stock.farmerId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (stock.image) {
      const filePath = path.join(__dirname, '..', stock.image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Stock.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Stock removed successfully' });
  } catch (error) {
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

