const Stock = require('../models/Stock');

// @desc    Get all available marketplace products (visible, approved, not expired)
// @route   GET /api/market
// @access  Private (Customer, Farmer, Admin)
exports.getProducts = async (req, res) => {
  try {
    const { search, minPrice, maxPrice, farmerId, page = 1, limit = 20 } = req.query;

    // Base filter: only show marketplace-ready items
    const filter = {
      visibility: true,
      approvalStatus: 'Approved',
      status: 'Available',
      expiryDate: { $gt: new Date() }
    };

    // Search by vegetable name (case-insensitive)
    if (search) {
      filter.vegetableName = { $regex: search, $options: 'i' };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.pricePerKg = {};
      if (minPrice) filter.pricePerKg.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerKg.$lte = Number(maxPrice);
    }

    // Filter by specific farmer
    if (farmerId) {
      filter.farmerId = farmerId;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Stock.find(filter)
        .populate('farmerId', 'name email profileDetails')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Stock.countDocuments(filter)
    ]);

    res.status(200).json({
      products,
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

// @desc    Get a single marketplace product by ID
// @route   GET /api/market/:id
// @access  Private (Customer, Farmer, Admin)
exports.getProductById = async (req, res) => {
  try {
    const product = await Stock.findOne({
      _id: req.params.id,
      visibility: true,
      approvalStatus: 'Approved',
      status: 'Available',
      expiryDate: { $gt: new Date() }
    }).populate('farmerId', 'name email profileDetails');

    if (!product) {
      return res.status(404).json({ message: 'Product not found or unavailable' });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get public products for landing page
// @route   GET /api/market/public
// @access  Public
exports.getPublicProducts = async (req, res) => {
  try {
    const filter = {
      visibility: true,
      approvalStatus: 'Approved',
      status: 'Available',
      expiryDate: { $gt: new Date() }
    };

    // Get a limited number of recent products (e.g., 6)
    const products = await Stock.find(filter)
      .populate('farmerId', 'name')
      .sort({ createdAt: -1 })
      .limit(6);

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
