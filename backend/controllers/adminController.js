const User = require('../models/User');
const Stock = require('../models/Stock');

// @desc    Get system-wide stock summary
// @route   GET /api/admin/summary
// @access  Private (Admin only)
exports.getSystemSummary = async (req, res) => {
  try {
    const activeStocks = await Stock.find({ status: 'Available' });
    
    let totalStockKg = 0;
    let totalStockValue = 0;

    activeStocks.forEach(stock => {
      totalStockKg += stock.quantity;
      totalStockValue += (stock.quantity * stock.pricePerKg);
    });

    const activeFarmersCount = await User.countDocuments({ role: 'Farmer', status: 'Active', isApproved: true });
    
    // Group stocks by category/vegetable for charts if needed
    const stockByCategory = {};
    activeStocks.forEach(stock => {
      const cat = stock.vegetableName;
      if (!stockByCategory[cat]) {
        stockByCategory[cat] = 0;
      }
      stockByCategory[cat] += stock.quantity;
    });

    res.status(200).json({
      totalStockKg,
      totalStockValue,
      activeFarmersCount,
      stockByCategory
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all farmers with stock counts
// @route   GET /api/admin/farmers
// @access  Private (Admin only)
exports.getAllFarmers = async (req, res) => {
  try {
    const farmers = await User.find({ role: 'Farmer' }).select('-password');
    
    // Get stock counts for each farmer
    const farmersWithStats = await Promise.all(farmers.map(async (farmer) => {
      const stocks = await Stock.find({ farmerId: farmer._id, status: 'Available' });
      
      let totalStockKg = 0;
      let totalStockValue = 0;
      stocks.forEach(stock => {
        totalStockKg += stock.quantity;
        totalStockValue += (stock.quantity * stock.pricePerKg);
      });

      return {
        ...farmer._doc,
        totalStockKg,
        totalStockValue,
        activeListingsCount: stocks.length
      };
    }));

    res.status(200).json(farmersWithStats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Enable/Disable a farmer account
// @route   PATCH /api/admin/farmers/:id/toggle-status
// @access  Private (Admin only)
exports.toggleFarmerStatus = async (req, res) => {
  try {
    const farmer = await User.findById(req.params.id);
    
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }
    
    if (farmer.role !== 'Farmer') {
      return res.status(400).json({ message: 'User is not a farmer' });
    }

    // Toggle between Active and Suspended
    farmer.status = farmer.status === 'Active' ? 'Suspended' : 'Active';
    await farmer.save();

    res.status(200).json({ 
      message: `Farmer account ${farmer.status.toLowerCase()}`, 
      status: farmer.status 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
