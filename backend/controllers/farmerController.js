const Stock = require('../models/Stock');
const Order = require('../models/Order');
const User = require('../models/User');
const { computeSpoilageMeta } = require('../utils/shelfLife');
const { notifyUser } = require('../utils/orderNotifications');

// @desc    Get dashboard insights for farmer
// @route   GET /api/farmer/insights
// @access  Private (Farmer only)
exports.getDashboardInsights = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const allStocks = await Stock.find({
      farmerId,
      isDeleted: false
    }).sort({ createdAt: -1 });

    const activeStocks = allStocks.filter(stock => stock.status === 'Available' || stock.status === 'Low Stock');

    let totalActiveStockValue = 0;
    let mostProfitableVegetable = { name: 'N/A', profit: 0 };
    const lowStockAlerts = [];
    const expiryAlerts = [];
const priceOverview = allStocks.map(stock => ({
      _id: stock._id,
      name: stock.name,
      quantity: stock.quantity,
      price: stock.pricePerKg,
      addedDate: stock.createdAt,
      status: stock.status
    }));
    const riskyItems = [];
    const spoilageSummary = { low: 0, medium: 0, high: 0, critical: 0 };

    activeStocks.forEach(stock => {
      const stockValue = stock.quantity * stock.pricePerKg;
      totalActiveStockValue += stockValue;

if (stockValue > mostProfitableVegetable.profit) {
        mostProfitableVegetable = {
          name: stock.name,
          profit: stockValue
        };
      }

      if (stock.quantity > 0 && stock.quantity < 10) {
        lowStockAlerts.push({
          _id: stock._id,
          name: stock.name,
          quantity: stock.quantity
        });
      }

      if (stock.expiryDate > now && stock.expiryDate <= threeDaysFromNow) {
        expiryAlerts.push({
          _id: stock._id,
          name: stock.name,
          expiryDate: stock.expiryDate,
          quantity: stock.quantity,
          pricePerKg: stock.pricePerKg
        });
      }
    });

    allStocks.forEach((stock) => {
      const meta = computeSpoilageMeta(stock, now);
      spoilageSummary[meta.spoilageRiskLevel] += 1;

      if (meta.spoilageRiskLevel !== 'low') {
        riskyItems.push({
          _id: stock._id,
          name: stock.name,
          severity: meta.spoilageRiskLevel,
          spoilageRiskLevel: meta.spoilageRiskLevel,
          wastage: stock.quantity,
          loss: meta.atRiskValue,
          daysLeft: meta.daysLeft,
          expiryDate: stock.expiryDate
        });
      }
    });

    riskyItems.sort((a, b) => b.loss - a.loss);

    const severityCounts = {
      critical: spoilageSummary.critical,
      warning: spoilageSummary.high + spoilageSummary.medium,
      none: spoilageSummary.low
    };

    const totalStocks = allStocks.length;
    const totalQuantity = allStocks.reduce((sum, stock) => sum + Math.max(stock.quantity, 0), 0);
    const availableItems = allStocks.filter(stock => stock.status === 'Available' || stock.status === 'Low Stock').length;
    const outOfStockCount = allStocks.filter(stock => stock.status === 'Out of Stock' || stock.quantity === 0).length;
    const financialWastage = riskyItems
      .filter((item) => item.spoilageRiskLevel === 'critical' || item.spoilageRiskLevel === 'high')
      .reduce((sum, item) => sum + item.loss, 0);
    
    let turnoverRate = 0;
    if (totalStocks > 0) {
      turnoverRate = ((outOfStockCount / totalStocks) * 100).toFixed(1);
    }

    res.status(200).json({
      totalActiveStockValue,
      mostProfitableVegetable,
      lowStockAlerts,
      expiryAlerts,
      priceOverview,
      riskyItems: riskyItems.slice(0, 5),
      severityMix: severityCounts,
      spoilageSummary,
      stockStats: {
        totalStocks,
        totalQuantity,
        availableItems,
        outOfStock: outOfStockCount,
        lowStockItems: lowStockAlerts.length,
        criticalSpoilage: spoilageSummary.critical + spoilageSummary.high,
        financialWastage
      },
      turnoverRate: `${turnoverRate}%`
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get stock stats for farmer dashboard
// @route   GET /api/farmer/stock-stats
// @access  Private (Farmer only)
exports.getStockStats = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const now = new Date();

    const stocks = await Stock.find({ farmerId, isDeleted: false });
    let criticalSpoilage = 0;
    let financialWastage = 0;

    stocks.forEach((stock) => {
      const meta = computeSpoilageMeta(stock, now);
      if (meta.spoilageRiskLevel === 'critical' || meta.spoilageRiskLevel === 'high') {
        criticalSpoilage += 1;
        financialWastage += meta.atRiskValue;
      }
    });

    res.status(200).json({
      totalStocks: stocks.length,
      totalQuantity: stocks.reduce((sum, stock) => sum + Math.max(stock.quantity, 0), 0),
      availableItems: stocks.filter(stock => stock.status === 'Available' || stock.status === 'Low Stock').length,
      outOfStock: stocks.filter(stock => stock.status === 'Out of Stock' || stock.quantity === 0).length,
      lowStockItems: stocks.filter(stock => stock.quantity > 0 && stock.quantity < 10).length,
      criticalSpoilage,
      financialWastage
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get price trends/suggestions for a vegetable
// @route   GET /api/farmer/price-trends/:name
// @access  Private (Farmer only)
exports.getPriceTrends = async (req, res) => {
  try {
    const name = req.params.name || req.params.vegetableName;
    
    // Find all stocks (across all farmers) for this vegetable to get market trend
    const stocks = await Stock.find({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
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

// @desc    Get farmer's orders
// @route   GET /api/farmer/orders
// @access  Private (Farmer only)
exports.getMyOrders = async (req, res) => {
try {
    const farmerId = req.user.id;
    // Get orders that have items from this farmer, excluding cancelled
    const orders = await Order.find({ 
      'items.farmerId': farmerId,
      status: { $nin: ['CANCELLED', 'Cancelled'] }
    }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/farmer/orders/:id
// @access  Private (Farmer only)
exports.getOrderById = async (req, res) => {
  try {
    const farmerId = req.user.id || req.user._id;
    const order = await Order.findOne({
      _id: req.params.id,
      'items.farmerId': farmerId
    });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get order by ID (public route from any farmer on the order)
// @route   GET /api/farmer/order/:id
// @access  Private (any farmer on the order)
exports.getFarmerOrderById = async (req, res) => {
  try {
    const farmerId = req.user.id || req.user._id;
    const order = await Order.findOne({
      _id: req.params.id,
      'items.farmerId': farmerId
    });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Confirm this farmer's line items (checks stock again, deducts qty)
// @route   POST /api/farmer/orders/:id/confirm
// @access  Private (Farmer only)
exports.confirmFarmerOrderLines = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.status === 'Cancelled') {
      return res.status(400).json({ message: 'Order is cancelled' });
    }

    const farmerId = String(req.user.id || req.user._id);
    const myPending = order.items.filter(
      (i) => String(i.farmerId) === farmerId && !i.farmerConfirmed
    );
    if (myPending.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Your produce on this order is already confirmed',
        data: order
      });
    }

    for (let i = 0; i < order.items.length; i += 1) {
      const line = order.items[i];
      if (String(line.farmerId) !== farmerId || line.farmerConfirmed) continue;

      const stock = await Stock.findById(line.stockId);
      if (!stock || stock.quantity < line.quantity) {
        return res.status(400).json({
          message: `Cannot confirm: not enough stock for ${line.product} (available ${stock ? stock.quantity : 0} kg).`
        });
      }

      stock.quantity -= line.quantity;
      if (stock.quantity <= 0) {
        stock.quantity = 0;
        stock.status = 'Out of Stock';
        stock.availabilityStatus = false;
        stock.visibility = false;
      }
      await stock.save();

      line.farmerConfirmed = true;
      line.stockDeducted = true;
      line.farmerConfirmedAt = new Date();
    }

order.markModified('items');
    const allDone = order.items.every((item) => item.farmerConfirmed);
    if (allDone) {
      order.status = 'CONFIRMED';
      order.legacyStatus = 'Processing';
    }
    await order.save();

    if (order.customerId) {
      await notifyUser(String(order.customerId), {
        title: allDone ? 'Order fully confirmed' : 'Part of your order confirmed',
        body: allDone
          ? 'All farmers confirmed stock. Your order is being prepared.'
          : 'A farmer confirmed vegetables on your order.',
        orderId: order._id,
        type: 'order_confirmed'
      });
    }

    res.json({
      success: true,
      data: order,
      message: allDone ? 'All farmers have confirmed. Order is now processing.' : 'Your items are confirmed and stock reserved.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get payment history
// @route   GET /api/farmer/payments
// @access  Private (Farmer only)
exports.getPaymentHistory = async (req, res) => {
try {
    // Get all completed orders for this farmer as payments
    const payments = await Order.find({ 
      'items.farmerId': req.user.id,
      $or: [{ status: 'DELIVERED' }, { legacyStatus: 'Delivered' }, { status: 'Delivered' }]
    }).sort({ updatedAt: -1 });
    
    const formatted = payments.map(order => ({
      _id: order._id,
      amount: order.totalAmount,
      date: order.updatedAt,
      status: order.paymentStatus || 'Paid'
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
