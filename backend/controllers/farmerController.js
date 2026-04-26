const Stock = require('../models/Stock');

// @desc    Get dashboard insights for farmer
// @route   GET /api/farmer/insights
// @access  Private (Farmer only)
exports.getDashboardInsights = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    // Fetch all active stocks for the farmer
    const activeStocks = await Stock.find({ 
        farmerId, 
        status: 'Available' 
    });

    let totalActiveStockValue = 0;
    let mostProfitableVegetable = { name: 'N/A', profit: 0 };
    const lowStockAlerts = [];
    const expiryAlerts = [];

    activeStocks.forEach(stock => {
      // Total value
      const stockValue = stock.quantity * stock.pricePerKg;
      totalActiveStockValue += stockValue;

      // Most profitable
      if (stockValue > mostProfitableVegetable.profit) {
        mostProfitableVegetable = {
          name: stock.vegetableName,
          profit: stockValue
        };
      }

      // Low stock (< 5 kg)
      if (stock.quantity > 0 && stock.quantity < 5) {
        lowStockAlerts.push({
          _id: stock._id,
          vegetableName: stock.vegetableName,
          quantity: stock.quantity
        });
      }

      // Near expiry (<= 3 days)
      if (stock.expiryDate > now && stock.expiryDate <= threeDaysFromNow) {
        expiryAlerts.push({
          _id: stock._id,
          vegetableName: stock.vegetableName,
          expiryDate: stock.expiryDate
        });
      }
    });

    // Turnover rate calculation (simplified mockup)
    // We'll calculate: (Out of Stock count) / (Total stock records) * 100
    const totalStocks = await Stock.countDocuments({ farmerId });
    const outOfStockCount = await Stock.countDocuments({ farmerId, status: 'Out of Stock' });
    
    let turnoverRate = 0;
    if (totalStocks > 0) {
      turnoverRate = ((outOfStockCount / totalStocks) * 100).toFixed(1);
    }

    res.status(200).json({
      totalActiveStockValue,
      mostProfitableVegetable,
      lowStockAlerts,
      expiryAlerts,
      turnoverRate: `${turnoverRate}%`
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get price trends/suggestions for a vegetable
// @route   GET /api/farmer/price-trends/:vegetableName
// @access  Private (Farmer only)
exports.getPriceTrends = async (req, res) => {
  try {
    const { vegetableName } = req.params;
    
    // Find all stocks (across all farmers) for this vegetable to get market trend
    const stocks = await Stock.find({ 
      vegetableName: { $regex: new RegExp(`^${vegetableName}$`, 'i') } 
    }).sort({ createdAt: -1 }).limit(20);

    if (stocks.length === 0) {
      return res.status(200).json({
        suggestedRange: null,
        message: 'No recent price data available for this vegetable'
      });
    }

    let sum = 0;
    let min = stocks[0].pricePerKg;
    let max = stocks[0].pricePerKg;

    stocks.forEach(s => {
      sum += s.pricePerKg;
      if (s.pricePerKg < min) min = s.pricePerKg;
      if (s.pricePerKg > max) max = s.pricePerKg;
    });

    const average = Math.round(sum / stocks.length);

    res.status(200).json({
      suggestedRange: {
        min,
        max,
        average
      },
      last7DaysTrend: stocks.map(s => ({
        price: s.pricePerKg,
        date: s.createdAt
      }))
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
