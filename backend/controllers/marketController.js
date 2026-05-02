const Stock = require('../models/Stock');
const { CATEGORY_ENUM } = require('../utils/stockCategory');

const marketplaceFilter = () => {
  const now = new Date();
  return {
    availabilityStatus: true,
    approvalStatus: 'Approved',
    visibility: true,
    isDeleted: false,
    quantity: { $gt: 0 },
    status: { $nin: ['Expired', 'Out of Stock'] },
    expiryDate: { $gt: now }
  };
};

// @desc    Get all available marketplace products (listings from farmer stock)
// @route   GET /api/market
// @access  Private (Customer, Farmer, Admin)
exports.getProducts = async (req, res) => {
  try {
    const { search, minPrice, maxPrice, farmerId, category, page = 1, limit = 20 } = req.query;

    const filter = marketplaceFilter();

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    if (minPrice || maxPrice) {
      filter.pricePerKg = {};
      if (minPrice) filter.pricePerKg.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerKg.$lte = Number(maxPrice);
    }

    if (farmerId) {
      filter.farmerId = farmerId;
    }

    if (category) {
      const c = String(category).toLowerCase().trim();
      if (CATEGORY_ENUM.includes(c)) {
        filter.category = c;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Stock.find(filter)
        .populate('farmerId', 'name email profileDetails')
        .populate('categoryId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
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
    const base = marketplaceFilter();

    const product = await Stock.findOne({
      _id: req.params.id,
      ...base
    })
      .populate('farmerId', 'name email profileDetails')
      .populate('categoryId', 'name')
      .lean();

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
    const filter = marketplaceFilter();

    const products = await Stock.find(filter)
      .populate('farmerId', 'name')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
