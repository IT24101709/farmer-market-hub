const User = require('../models/User');
const Stock = require('../models/Stock');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');

// FSM-04 Freeze farmer stock access (separate from account suspend)
exports.freezeFarmerStock = async (req, res) => {
  try {
    const { frozenUntil } = req.body;
    if (!frozenUntil) {
      return res.status(400).json({ message: '❌ frozenUntil date is required' });
    }

    const farmer = await User.findOne({ _id: req.params.id, role: 'Farmer' });
    if (!farmer) return res.status(404).json({ message: '❌ Farmer not found' });

    // Check no pending orders (spec)
    const pendingOrders = await Order.findOne({
      'items.farmerId': farmer._id,
      status: { $in: ['Pending', 'Processing', 'Shipped'] }
    });
    if (pendingOrders) {
      return res.status(400).json({ message: `❌ Cannot freeze farmer ${farmer.name} — they have pending verified orders.` });
    }

    farmer.stockFrozenUntil = new Date(frozenUntil);
    await farmer.save();

    await AuditLog.create({
      adminId: req.user.id,
      targetUserId: farmer._id,
      action: 'FREEZE_FARMER_STOCK',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: { frozenUntil, reason: 'Quality complaints or abuse' }
    });

    res.status(200).json({ 
      message: `🔒 Farmer ${farmer.name} frozen from adding/modifying stock until ${new Date(frozenUntil).toLocaleDateString()}.` 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// FSM-05 Admin manual remove w/reason (soft-delete)
exports.adminRemoveStock = async (req, res) => {
  try {
    const { reason } = req.query;
    if (!reason) {
      return res.status(400).json({ message: '❌ Please provide a reason for removing this stock listing.' });
    }

    const stock = await Stock.findById(req.params.id).populate('farmerId');
    if (!stock) return res.status(404).json({ message: '❌ Stock not found' });

    if (stock.isDeleted) {
      return res.status(400).json({ message: '❌ Already removed' });
    }

    // Check active orders
    const activeOrder = await Order.findOne({
      'items.stockId': stock._id,
      status: { $in: ['Pending', 'Processing', 'Shipped'] }
    });
    if (activeOrder) {
      return res.status(400).json({ message: '❌ Cannot remove stock with active orders.' });
    }

    stock.isDeleted = true;
    stock.removalReason = reason;
    stock.visibility = false;
    await stock.save();

await AuditLog.create({
      adminId: req.user.id,
      stockId: stock._id,
      action: 'ADMIN_STOCK_REMOVE',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: { reason, name: stock.name, farmer: stock.farmerId.name }
    });

    res.status(200).json({ 
      message: `✅ ${stock.name} listing removed. Reason: ${reason}. Farmer notified.` 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Missing admin functions - stubs for development
exports.getSystemSummary = async (req, res) => {
  try {
    res.status(200).json({ summary: 'System summary placeholder' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllFarmers = async (req, res) => {
  try {
    res.status(200).json({ farmers: [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    res.status(200).json({ users: [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    res.status(200).json({ message: 'User status toggled' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.registerUserManually = async (req, res) => {
  try {
    res.status(200).json({ message: 'User registered' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    res.status(200).json({ message: 'Password reset' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.toggleTwoFactorAuth = async (req, res) => {
  try {
    res.status(200).json({ message: '2FA toggled' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.editFarmerProfile = async (req, res) => {
  try {
    res.status(200).json({ message: 'Farmer profile updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteFarmer = async (req, res) => {
  try {
    res.status(200).json({ message: 'Farmer deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.suspendFarmer = async (req, res) => {
  try {
    res.status(200).json({ message: 'Farmer suspended' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.reactivateFarmer = async (req, res) => {
  try {
    res.status(200).json({ message: 'Farmer reactivated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.assignRegion = async (req, res) => {
  try {
    res.status(200).json({ message: 'Region assigned' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.exportFarmers = async (req, res) => {
  try {
    res.status(200).json({ message: 'Farmers exported' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getFarmerHistory = async (req, res) => {
  try {
    res.status(200).json({ history: [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.approveFarmerStock = async (req, res) => {
  try {
    res.status(200).json({ message: 'Stock approved' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAdminStocks = async (req, res) => {
  try {
    res.status(200).json({ stocks: [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.adminToggleProductVisibility = async (req, res) => {
  try {
    res.status(200).json({ message: 'Product visibility toggled' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.adminRemoveProduct = async (req, res) => {
  try {
    res.status(200).json({ message: 'Product removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.adminBulkHideProducts = async (req, res) => {
  try {
    res.status(200).json({ message: 'Products hidden' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.adminOverridePrice = async (req, res) => {
  try {
    res.status(200).json({ message: 'Price overridden' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.applyGlobalVisibilityRules = async (req, res) => {
  try {
    res.status(200).json({ message: 'Rules applied' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.adminUpdateStock = async (req, res) => {
  try {
    res.status(200).json({ message: 'Stock updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
