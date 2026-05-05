const User = require('../models/User');
const Stock = require('../models/Stock');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

const syncStockAvailability = (stock) => {
  const quantity = Number(stock.quantity || 0);
  const isAvailable = stock.status === 'Available' && quantity > 0 && !stock.isDeleted;

  stock.availabilityStatus = isAvailable;
  stock.visibility = isAvailable;

  if (quantity <= 0) {
    stock.status = 'Out of Stock';
    stock.availabilityStatus = false;
    stock.visibility = false;
  }
};

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

    await Notification.create({
      userId: stock.farmerId._id || stock.farmerId,
      title: 'Stock Removed by Admin',
      body: `Your stock listing for ${stock.name} was removed by an administrator. Reason: ${reason}.`,
      type: 'system'
    });

    res.status(200).json({ 
      message: `✅ ${stock.name} listing removed. Reason: ${reason}. Farmer notified.` 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Missing admin functions - stubs for development
// ============ Dashboard Analytics ============

// @desc    Get system-wide summary for admin dashboard
// @route   GET /api/admin/summary
// @access Private (Admin only)
exports.getSystemSummary = async (req, res) => {
  try {
    // Count active farmers (role=Farmer, isApproved=true, status=Active)
    const activeFarmersCount = await User.countDocuments({
      role: 'Farmer',
      isApproved: true,
      status: 'Active'
    });

    // Calculate total stock in kg (visible, non-deleted items)
    const stocks = await Stock.find({ visibility: true, isDeleted: false });
    const totalStockKg = stocks.reduce((sum, stock) => sum + (stock.quantity || 0), 0);

    // Calculate total stock value in LKR
    const totalStockValue = stocks.reduce((sum, stock) => {
      return sum + ((stock.quantity || 0) * (stock.price || 0));
    }, 0);

    // Count pending orders
    const pendingOrdersCount = await Order.countDocuments({ status: 'PENDING' });

    // Count confirmed orders
    const confirmedOrdersCount = await Order.countDocuments({ status: 'CONFIRMED' });

    // Count delivered orders
    const deliveredOrdersCount = await Order.countDocuments({ status: 'DELIVERED' });

    res.status(200).json({
      activeFarmersCount,
      totalStockKg,
      totalStockValue,
      pendingOrdersCount,
      confirmedOrdersCount,
      deliveredOrdersCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all farmers
// @route   GET /api/admin/farmers
// @access Private (Admin only)
exports.getAllFarmers = async (req, res) => {
  try {
    const farmers = await User.find({ role: 'Farmer' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.status(200).json(farmers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access Private (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ role: 1, createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Toggle user status (Active/Suspended)
// @route   PATCH /api/admin/users/:id/toggle-status
// @access Private (Admin only)
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Toggle status
    user.status = user.status === 'Active' ? 'Suspended' : 'Active';
    await user.save();

    await AuditLog.create({
      adminId: req.user.id,
      targetUserId: user._id,
      action: 'TOGGLE_USER_STATUS',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: { newStatus: user.status }
    });

    res.status(200).json({ 
      message: `User ${user.name} status changed to ${user.status}`,
      user: { _id: user._id, name: user.name, email: user.email, status: user.status }
    });
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

// @desc    Delete farmer permanently
// @route   DELETE /api/admin/farmers/:id
// @access Private (Admin only)
exports.deleteFarmer = async (req, res) => {
  try {
    const farmer = await User.findOne({ _id: req.params.id, role: 'Farmer' });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    // Check for active orders
    const activeOrders = await Order.findOne({
      'items.farmerId': farmer._id,
      status: { $in: ['PENDING', 'CONFIRMED', 'READY_FOR_DELIVERY', 'ASSIGNED', 'IN_TRANSIT'] }
    });
    if (activeOrders) {
      return res.status(400).json({ message: 'Cannot delete farmer with active orders' });
    }

    await User.findByIdAndDelete(farmer._id);

    await AuditLog.create({
      adminId: req.user.id,
      targetUserId: farmer._id,
      action: 'DELETE_FARMER',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: { deletedFarmer: farmer.name }
    });

    res.status(200).json({ message: `Farmer ${farmer.name} has been deleted` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Suspend farmer
// @route   POST /api/admin/farmers/:id/suspend
// @access Private (Admin only)
exports.suspendFarmer = async (req, res) => {
  try {
    const farmer = await User.findOne({ _id: req.params.id, role: 'Farmer' });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    farmer.status = 'Suspended';
    await farmer.save();

    await AuditLog.create({
      adminId: req.user.id,
      targetUserId: farmer._id,
      action: 'SUSPEND_FARMER',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: { reason: req.body?.reason }
    });

    res.status(200).json({
      message: `Farmer ${farmer.name} has been suspended`,
      farmer: { _id: farmer._id, name: farmer.name, status: farmer.status }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Reactivate farmer
// @route   POST /api/admin/farmers/:id/reactivate
// @access Private (Admin only)
exports.reactivateFarmer = async (req, res) => {
  try {
    const farmer = await User.findOne({ _id: req.params.id, role: 'Farmer' });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    farmer.status = 'Active';
    await farmer.save();

    await AuditLog.create({
      adminId: req.user.id,
      targetUserId: farmer._id,
      action: 'REACTIVATE_FARMER',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: {}
    });

    res.status(200).json({
      message: `Farmer ${farmer.name} has been reactivated`,
      farmer: { _id: farmer._id, name: farmer.name, status: farmer.status }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Assign region to farmer
// @route   POST /api/admin/farmers/:id/region
// @access Private (Admin only)
exports.assignRegion = async (req, res) => {
  try {
    const { region } = req.body;
    const validRegions = ['North', 'South', 'East', 'West', 'Central'];

    if (!region || !validRegions.includes(region)) {
      return res.status(400).json({ message: 'Invalid region' });
    }

    const farmer = await User.findOne({ _id: req.params.id, role: 'Farmer' });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    farmer.profileDetails = farmer.profileDetails || {};
    farmer.profileDetails.region = region;
    await farmer.save();

    res.status(200).json({
      message: `Region ${region} assigned to ${farmer.name}`,
      farmer
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get delivery agents (filtered)
// @route   GET /api/admin/delivery-agents
// @access Private (Admin only)
exports.getDeliveryAgents = async (req, res) => {
  try {
    const { minKg = 0, vehicleType, city } = req.query;
    
    let filter = { role: 'DeliveryAgent', 'profileDetails.isActiveAgent': true };

    if (parseFloat(minKg) > 0) {
      filter['profileDetails.maxCapacityKg'] = { $gte: parseFloat(minKg) };
    }
    if (vehicleType) {
      filter['profileDetails.vehicleType'] = vehicleType;
    }
    if (city) {
      filter['profileDetails.serviceCities'] = city;
    }

    const agents = await User.find(filter)
      .select('-password')
      .sort({ 'profileDetails.maxCapacityKg': -1, createdAt: -1 });
    res.status(200).json({ success: true, data: agents });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// @desc    Assign delivery agent to order
// @route   POST /api/admin/orders/:id/assign-agent
// @access Private (Admin only)
exports.assignDeliveryAgent = async (req, res) => {
  try {
    const { agentId } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'READY_FOR_DELIVERY') {
      return res.status(400).json({ message: 'Order not ready for delivery' });
    }

    const agent = await User.findOne({ _id: agentId, role: 'DeliveryAgent', status: 'Active' });
    if (!agent) {
      return res.status(404).json({ message: 'Delivery agent not found or inactive' });
    }

    order.deliveryAgent = agentId;
    order.status = 'ASSIGNED';
    await order.save();

    await AuditLog.create({
      adminId: req.user.id,
      orderId: order._id,
      action: 'ASSIGN_DELIVERY_AGENT',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: { agentId, agentName: agent.name }
    });

    res.status(200).json({
      message: `Delivery agent ${agent.name} assigned to order`,
      order
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get pending shipments
// @route   GET /api/admin/shipments/pending
// @access Private (Admin only)
exports.getPendingShipments = async (req, res) => {
  try {
    const shipments = await Order.find({
      status: { $in: ['CONFIRMED', 'READY_FOR_DELIVERY', 'ASSIGNED'] }
    })
      .populate('customer', 'name email profileDetails')
      .populate('deliveryAgent', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json(shipments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Export farmers data
// @route   GET /api/admin/farmers/export
// @access Private (Admin only)
exports.exportFarmers = async (req, res) => {
  try {
    const farmers = await User.find({ role: 'Farmer' })
      .select('name email profileDetails status isApproved createdAt')
      .sort({ createdAt: -1 });

    const data = farmers.map(f => ({
      name: f.name,
      email: f.email,
      phone: f.profileDetails?.phone || '',
      businessName: f.profileDetails?.businessName || '',
      status: f.status,
      isApproved: f.isApproved,
      registeredAt: f.createdAt
    }));

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all orders for admin
// @route   GET /api/admin/orders
// @access Private (Admin only)
exports.getAdminOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.status(200).json({
      orders,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access Private (Admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'READY_FOR_DELIVERY', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    if (notes) {
      order.notes = notes;
    }
    await order.save();

    await AuditLog.create({
      adminId: req.user.id,
      orderId: order._id,
      action: 'UPDATE_ORDER_STATUS',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: { newStatus: status, notes }
    });

    res.status(200).json({
      message: `Order status updated to ${status}`,
      order
    });
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

// @desc    Get all stocks for admin management
// @route   GET /api/admin/stocks
// @access Private (Admin only)
exports.getAdminStocks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      minPrice,
      maxPrice,
      status,
      includeDeleted
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const query = {};
    if (includeDeleted !== 'true') query.isDeleted = false;
    if (search) query.name = { $regex: String(search).trim(), $options: 'i' };
    if (category) query.category = String(category).toLowerCase().trim();
    if (status) query.status = status;
    if (minPrice || maxPrice) {
      query.pricePerKg = {};
      if (minPrice) query.pricePerKg.$gte = Number(minPrice);
      if (maxPrice) query.pricePerKg.$lte = Number(maxPrice);
    }

    const [products, total] = await Promise.all([
      Stock.find(query)
        .populate('farmerId', 'name email profileDetails')
        .populate('categoryId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      Stock.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      products,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Toggle product visibility
// @route   PATCH /api/admin/stocks/:id/toggle-visibility
// @access Private (Admin only)
exports.adminToggleProductVisibility = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ message: 'Product not found' });
    }

    stock.visibility = !stock.visibility;
    await stock.save();

    await AuditLog.create({
      adminId: req.user.id,
      stockId: stock._id,
      action: 'TOGGLE_PRODUCT_VISIBILITY',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: { newVisibility: stock.visibility }
    });

    await Notification.create({
      userId: stock.farmerId,
      title: 'Stock Visibility Changed',
      body: `The visibility of your stock ${stock.name} has been set to ${stock.visibility ? 'Visible' : 'Hidden'} by an administrator.`,
      type: 'system'
    });

    res.status(200).json({
      message: `Product visibility set to ${stock.visibility ? 'Visible' : 'Hidden'}`,
      stock
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Remove product
// @route   DELETE /api/admin/stocks/:id
// @access Private (Admin only)
exports.adminRemoveProduct = async (req, res) => {
  try {
    const reason = req.query.reason || req.body?.reason || 'Removed by admin';

    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (stock.isDeleted) {
      return res.status(200).json({ message: 'Product already removed' });
    }

    stock.isDeleted = true;
    stock.visibility = false;
    stock.availabilityStatus = false;
    stock.status = 'Out of Stock';
    stock.removalReason = reason;
    await stock.save();

    await Promise.allSettled([
      AuditLog.create({
        adminId: req.user.id,
        stockId: stock._id,
        action: 'REMOVE_PRODUCT',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        details: { reason, product: stock.name }
      }),
      Notification.create({
        userId: stock.farmerId,
        title: 'Product Removed by Admin',
        body: `Your product ${stock.name} was removed from the marketplace. Reason: ${reason}.`,
        type: 'system'
      })
    ]);

    res.status(200).json({ message: 'Product removed successfully' });
  } catch (error) {
    console.error('Admin remove product error:', error);
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
    const price = Number(req.body.pricePerKg);
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0.' });
    }

    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).json({ message: 'Stock not found' });
    if (stock.isDeleted) return res.status(400).json({ message: 'Cannot update deleted stock.' });

    stock.pricePerKg = Number(price.toFixed(2));
    const updatedStock = await stock.save();

    await AuditLog.create({
      adminId: req.user.id,
      stockId: updatedStock._id,
      action: 'ADMIN_PRICE_OVERRIDE',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: { pricePerKg: updatedStock.pricePerKg, name: updatedStock.name }
    });

    res.status(200).json({ message: 'Price updated successfully', stock: updatedStock });
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
    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).json({ message: 'Stock not found' });
    if (stock.isDeleted) return res.status(400).json({ message: 'Cannot update deleted stock.' });

    const allowedFields = [
      'name',
      'category',
      'unit',
      'description',
      'harvestDate',
      'expiryDate',
      'quantity',
      'pricePerKg',
      'qualityGrade',
      'status'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        stock[field] = req.body[field];
      }
    });

    if (req.body.pricePerKg !== undefined) {
      const price = Number(req.body.pricePerKg);
      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ message: 'Price must be greater than 0.' });
      }
      stock.pricePerKg = Number(price.toFixed(2));
    }

    if (req.body.quantity !== undefined) {
      const quantity = Number(req.body.quantity);
      if (!Number.isFinite(quantity) || quantity < 0) {
        return res.status(400).json({ message: 'Quantity must be 0 or a positive number.' });
      }
      stock.quantity = quantity;
    }

    syncStockAvailability(stock);
    const updatedStock = await stock.save();

    await AuditLog.create({
      adminId: req.user.id,
      stockId: updatedStock._id,
      action: 'ADMIN_STOCK_UPDATE',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: { name: updatedStock.name, quantity: updatedStock.quantity, pricePerKg: updatedStock.pricePerKg }
    });

    res.status(200).json({ message: 'Stock updated successfully', stock: updatedStock });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
