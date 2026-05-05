const Order = require('../models/Order');
const Stock = require('../models/Stock');
const Delivery = require('../models/Delivery');
const { notifyUser, notifyFarmersForOrder } = require('../utils/orderNotifications');

const normalizeFarmerId = (f) => {
  if (!f) return null;
  if (typeof f === 'object') return f._id || f.id;
  return f;
};

const uid = (user) => String(user?.id || user?._id || '');

async function ensureDeliveryForOrder(order) {
  if (!order?.customerId) {
    throw new Error('Order cannot be sent to delivery without a customer');
  }

  return Delivery.findOneAndUpdate(
    { orderId: order._id },
    {
      orderId: order._id,
      customerId: order.customerId,
      deliveryAddress: order.deliveryAddress || 'Address not provided',
      note: order.note || '',
      status: 'pending'
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );
}

async function validateOrderLines(items) {
  const errors = [];
  for (const raw of items) {
    const qty = Number(raw.quantity);
    const stock = await Stock.findById(raw.stockId);
    if (!stock || stock.isDeleted) {
      errors.push(`"${raw.product || 'Item'}": product not found`);
      continue;
    }
    if (!stock.availabilityStatus || ['Out of Stock', 'Expired'].includes(stock.status)) {
      errors.push(`"${raw.product}": not available for sale`);
      continue;
    }
    if (stock.expiryDate <= new Date()) {
      errors.push(`"${raw.product}": listing has expired`);
      continue;
    }
    if (stock.approvalStatus !== 'Approved') {
      errors.push(`"${raw.product}": not approved for sale`);
      continue;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      errors.push(`"${raw.product}": invalid quantity`);
      continue;
    }
    if (stock.quantity < qty) {
      errors.push(`"${raw.product}": only ${stock.quantity} kg available (you asked for ${qty})`);
    }
  }
  return errors;
}

async function restoreDeductedStock(order) {
  for (const line of order.items || []) {
    if (line.stockDeducted && line.stockId) {
      await Stock.findByIdAndUpdate(line.stockId, { $inc: { quantity: line.quantity } });
      line.stockDeducted = false;
      line.farmerConfirmed = false;
      line.farmerConfirmedAt = null;
    }
  }
  order.markModified('items');
}

// @desc    Create order (customer only — stock checked, not deducted until farmer confirms)
// @route   POST /api/orders
// @access  Private Customer
exports.createOrder = async (req, res) => {
  try {
    const { customerName, items, deliveryAddress, note } = req.body;
    if (!customerName?.trim() || !items?.length) {
      return res.status(400).json({
        success: false,
        message: 'Please provide customerName and at least one item'
      });
    }

    const errs = await validateOrderLines(items);
    if (errs.length) {
      return res.status(400).json({
        success: false,
        message: 'Stock check failed. Adjust quantities or remove unavailable items.',
        errors: errs
      });
    }

    const normalizedItems = items.map((item) => ({
      stockId: item.stockId,
      product: item.product,
      quantity: Number(item.quantity),
      price: Number(item.price),
      farmerId: normalizeFarmerId(item.farmerId),
      farmerConfirmed: false,
      stockDeducted: true
    }));

    const totalAmount = normalizedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const customerObjectId = req.user._id || req.user.id;

    const order = await Order.create({
      customerName: customerName.trim(),
      customerId: customerObjectId,
      items: normalizedItems,
      totalAmount,
      status: 'PENDING',
      deliveryAddress: (deliveryAddress || '').trim(),
      note: (note || '').trim()
    });

    // Deduct stock immediately after order creation
    for (const item of normalizedItems) {
      const stock = await Stock.findById(item.stockId);
      if (stock) {
        stock.quantity -= item.quantity;
        
        if (stock.quantity <= 0) {
          // Auto-delete if quantity reaches 0
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
          
          const AuditLog = require('../models/AuditLog');
          await AuditLog.create({
            userId: customerObjectId,
            stockId: stock._id,
            action: 'STOCK_AUTO_DELETED',
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            details: { name: stock.name, reason: 'Quantity reached zero after customer order' }
          });
        } else {
          await stock.save();
        }
      }
    }

    await notifyFarmersForOrder(order, {
      title: 'New vegetable order',
      body: `${customerName.trim()} ordered items you supply. Open Orders to confirm and reserve stock.`,
      type: 'order_placed'
    });

    await notifyUser(String(customerObjectId), {
      title: 'Order placed',
      body: `Farmers have been notified. Order #${String(order._id).slice(-6).toUpperCase()} is pending their confirmation.`,
      orderId: order._id,
      type: 'order_placed'
    });

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Customer order history
// @route   GET /api/orders/my
// @access  Private Customer
exports.getMyOrders = async (req, res) => {
  try {
    const customerObjectId = req.user._id || req.user.id;
    const orders = await Order.find({ customerId: customerObjectId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single order (customer who owns it, any farmer on the order, or admin)
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'name email profileDetails')
      .populate('deliveryAgentId', 'name email profileDetails')
      .populate('items.stockId', 'name category unit pricePerKg imageUrl status availabilityStatus')
      .populate('items.farmerId', 'name email profileDetails');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const userId = uid(req.user);
    const isAdmin = req.user.role === 'Admin';
    const isCustomer = order.customerId && String(order.customerId) === userId;
    const isFarmer = (order.items || []).some((i) => String(i.farmerId) === userId);

    if (!isAdmin && !isCustomer && !isFarmer) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update order — admin (full), customer (cancel pending), farmer (ship when processing)
// @route   PUT /api/orders/:id
// @access  Private
exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const userId = uid(req.user);
    const isAdmin = req.user.role === 'Admin';
    const isCustomer = order.customerId && String(order.customerId) === userId;
    const isFarmer = (order.items || []).some((i) => String(i.farmerId) === userId);

    const { customerName, items, status } = req.body;

    if (isAdmin) {
      if (customerName) order.customerName = customerName;
      if (items?.length) {
        order.items = items;
        order.totalAmount = items.reduce((acc, i) => acc + Number(i.price) * Number(i.quantity), 0);
      }
if (status) {
        if ((status === 'Cancelled' || status === 'CANCELLED') && order.status !== 'CANCELLED' && order.status !== 'Cancelled') {
          await restoreDeductedStock(order);
          order.status = 'CANCELLED';
          order.legacyStatus = 'Cancelled';
        } else {
          order.status = status;
          if (status === 'CANCELLED') order.legacyStatus = 'Cancelled';
          else if (status === 'CONFIRMED') order.legacyStatus = 'Processing';
          else if (status === 'DELIVERED') order.legacyStatus = 'Delivered';
        }
      }
      await order.save();
      if (order.customerId && status) {
        await notifyUser(String(order.customerId), {
          title: 'Order updated',
          body: `Your order #${String(order._id).slice(-6).toUpperCase()} status is now ${order.status}.`,
          orderId: order._id,
          type: 'order_status'
        });
      }
      return res.status(200).json({ success: true, data: order, message: 'Order updated' });
    }

if (isCustomer && status === 'Cancelled') {
      if (order.status !== 'PENDING' && order.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'Only pending orders can be cancelled by the customer'
        });
      }
      await restoreDeductedStock(order);
      order.status = 'CANCELLED';
      order.legacyStatus = 'Cancelled';
      await order.save();
      await notifyFarmersForOrder(order, {
        title: 'Order cancelled',
        body: `Order #${String(order._id).slice(-6).toUpperCase()} was cancelled by the customer.`,
        type: 'order_cancelled'
      });
      return res.status(200).json({ success: true, data: order, message: 'Order cancelled' });
    }

if (isFarmer && status === 'READY_FOR_DELIVERY' && order.status === 'CONFIRMED') {
      order.status = 'READY_FOR_DELIVERY';
      order.legacyStatus = 'Processing';
      await order.save();
      await ensureDeliveryForOrder(order);
      if (order.customerId) {
        await notifyUser(String(order.customerId), {
          title: 'Order ready for delivery',
          body: `Your order #${String(order._id).slice(-6).toUpperCase()} is ready for delivery.`,
          orderId: order._id,
          type: 'order_status'
        });
      }
      return res.status(200).json({ success: true, data: order, message: 'Order sent to delivery module' });
    }

    if (isFarmer && status === 'DELIVERED' && order.status === 'IN_TRANSIT') {
      order.status = 'DELIVERED';
      order.legacyStatus = 'Delivered';
      await order.save();
      if (order.customerId) {
        await notifyUser(String(order.customerId), {
          title: 'Order delivered',
          body: `Your order #${String(order._id).slice(-6).toUpperCase()} is marked delivered.`,
          orderId: order._id,
          type: 'order_status'
        });
      }
      return res.status(200).json({ success: true, data: order, message: 'Order marked delivered' });
    }

    return res.status(403).json({
      success: false,
      message: 'You cannot perform this update. Use confirm on farmer orders, or contact admin.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete order (admin)
// @route   DELETE /api/orders/:id
// @access  Private Admin
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    await restoreDeductedStock(order);
    await Order.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    All orders (admin)
// @route   GET /api/admin/orders
// @access  Private Admin
exports.getAllOrdersAdmin = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search && String(search).trim()) {
      const q = String(search).trim();
      filter.$or = [{ customerName: { $regex: q, $options: 'i' } }];
      if (/^[a-fA-F0-9]{24}$/.test(q)) {
        filter.$or.push({ _id: q });
      }
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200);
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Step 2: Farmer confirms order (stock validated) -> CONFIRMED
// @route   PUT /api/orders/:id/confirm
// @access  Private Farmer
exports.confirmOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const userId = uid(req.user);
    const isFarmer = (order.items || []).some((i) => String(i.farmerId) === userId);
    if (!isFarmer && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only farmers on this order can confirm' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm order in ${order.status} status`
      });
    }

    // Deduct stock for this farmer's items
    for (const line of order.items) {
      if (String(line.farmerId) === userId && !line.stockDeducted) {
        const stock = await Stock.findById(line.stockId);
        if (stock && stock.quantity >= line.quantity) {
          await Stock.findByIdAndUpdate(line.stockId, { $inc: { quantity: -line.quantity } });
          line.stockDeducted = true;
          line.farmerConfirmed = true;
          line.farmerConfirmedAt = new Date();
        }
      }
    }
    order.markModified('items');

    // Check if all items confirmed -> then move to CONFIRMED
    const allConfirmed = order.items.every((i) => i.farmerConfirmed);
    if (allConfirmed) {
      order.status = 'CONFIRMED';
      order.legacyStatus = 'Processing';
    }

    await order.save();

    if (order.customerId) {
      await notifyUser(String(order.customerId), {
        title: 'Order confirmed',
        body: `Order #${String(order._id).slice(-6).toUpperCase()} is confirmed by farmers.`,
        orderId: order._id,
        type: 'order_status'
      });
    }

    res.status(200).json({
      success: true,
      data: order,
      message: allConfirmed ? 'Order confirmed and ready for delivery' : 'Items confirmed'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Step 3: Send to Delivery Module (READY_FOR_DELIVERY)
// @route   PUT /api/orders/:id/send-to-delivery
// @access  Private Admin
exports.sendToDelivery = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'CONFIRMED') {
      return res.status(400).json({
        success: false,
        message: `Order must be CONFIRMED before sending to delivery. Current: ${order.status}`
      });
    }

    order.status = 'READY_FOR_DELIVERY';
    order.legacyStatus = 'Processing';
    await order.save();
    await ensureDeliveryForOrder(order);

    res.status(200).json({
      success: true,
      data: order,
      message: 'Order sent to delivery module'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Step 4: Assign delivery agent (ASSIGNED)
// @route   PUT /api/orders/:id/assign-agent
// @access  Private Admin
exports.assignAgent = async (req, res) => {
  try {
    const { agentId } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'READY_FOR_DELIVERY') {
      return res.status(400).json({
        success: false,
        message: `Order must be READY_FOR_DELIVERY. Current: ${order.status}`
      });
    }

    order.deliveryAgentId = agentId;
    order.deliveryAssignedAt = new Date();
    order.status = 'ASSIGNED';
    order.legacyStatus = 'Processing';
    await order.save();

    // Notify delivery agent
    if (agentId) {
      await notifyUser(String(agentId), {
        title: 'New delivery assigned',
        body: `Order #${String(order._id).slice(-6).toUpperCase()} assigned to you for delivery.`,
        orderId: order._id,
        type: 'delivery_assigned'
      });
    }

    res.status(200).json({
      success: true,
      data: order,
      message: 'Delivery agent assigned'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Step 5: Start delivery (IN_TRANSIT)
// @route   PUT /api/orders/:id/start-delivery
// @access  Private Delivery Agent
exports.startDelivery = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const userId = uid(req.user);
    if (String(order.deliveryAgentId) !== userId && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Not assigned to this order' });
    }

    if (order.status !== 'ASSIGNED') {
      return res.status(400).json({
        success: false,
        message: `Order must be ASSIGNED. Current: ${order.status}`
      });
    }

    order.status = 'IN_TRANSIT';
    order.legacyStatus = 'Shipped';
    await order.save();

    if (order.customerId) {
      await notifyUser(String(order.customerId), {
        title: 'Delivery started',
        body: `Your order #${String(order._id).slice(-6).toUpperCase()} is on the way!`,
        orderId: order._id,
        type: 'order_status'
      });
    }

    res.status(200).json({
      success: true,
      data: order,
      message: 'Delivery started'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Step 6: Complete delivery (DELIVERED)
// @route   PUT /api/orders/:id/complete-delivery
// @access  Private Delivery Agent
exports.completeDelivery = async (req, res) => {
  try {
    const { notes } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const userId = uid(req.user);
    if (String(order.deliveryAgentId) !== userId && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Not assigned to this order' });
    }

    if (order.status !== 'IN_TRANSIT') {
      return res.status(400).json({
        success: false,
        message: `Order must be IN_TRANSIT. Current: ${order.status}`
      });
    }

    order.status = 'DELIVERED';
    order.legacyStatus = 'Delivered';
    order.deliveredAt = new Date();
    if (notes) order.deliveryNotes = notes;
    await order.save();

    if (order.customerId) {
      await notifyUser(String(order.customerId), {
        title: 'Order delivered',
        body: `Your order #${String(order._id).slice(-6).toUpperCase()} has been delivered. Thank you!`,
        orderId: order._id,
        type: 'order_status'
      });
    }

    res.status(200).json({
      success: true,
      data: order,
      message: 'Delivery completed'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get orders ready for delivery (READY_FOR_DELIVERY or ASSIGNED)
// @route   GET /api/admin/shipments/pending
// @access  Private Admin
exports.getPendingShipments = async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ['READY_FOR_DELIVERY', 'ASSIGNED', 'IN_TRANSIT'] }
    }).sort({ createdAt: -1 }).limit(100);

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin: Approve or Reject order (force change status)
// @route   PUT /api/orders/:id/admin-approve
// @access  Private Admin
exports.adminApproveOrder = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Validate admin's choice
    const validStatuses = [
      'PENDING', 'CONFIRMED', 'CANCELLED', 'READY_FOR_DELIVERY',
      'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED_DELIVERY'
    ];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Admin can force any status.'
      });
    }

// If admin cancelling, restore stock
    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
      await restoreDeductedStock(order);
    }

    order.status = status;
    if (status === 'CANCELLED') order.legacyStatus = 'Cancelled';
    else if (status === 'CONFIRMED') order.legacyStatus = 'Processing';
    else if (status === 'DELIVERED') order.legacyStatus = 'Delivered';
    if (notes) order.deliveryNotes = notes;
    await order.save();

    // Notify customer
    if (order.customerId) {
      await notifyUser(String(order.customerId), {
        title: 'Order updated by admin',
        body: `Order #${String(order._id).slice(-6).toUpperCase()} status is now ${status}.`,
        orderId: order._id,
        type: 'order_status'
      });
    }

    res.status(200).json({
      success: true,
      data: order,
      message: `Order updated to ${status} by admin`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin: Set order status directly
// @route   PUT /api/orders/:id/set-status
// @access  Private Admin
exports.setOrderStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const oldStatus = order.status;
    
    // Valid statuses for admin to set
    const validStatuses = [
      'PENDING', 'CONFIRMED', 'CANCELLED', 'READY_FOR_DELIVERY',
      'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED_DELIVERY'
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid: ${validStatuses.join(', ')}`
      });
    }

    // If setting to CANCELLED, restore stock
    if (status === 'CANCELLED' && oldStatus !== 'CANCELLED') {
      await restoreDeductedStock(order);
    }

// Update order status
    order.status = status;
    if (status === 'CANCELLED') order.legacyStatus = 'Cancelled';
    else if (status === 'CONFIRMED') order.legacyStatus = 'Processing';
    else if (status === 'DELIVERED') order.legacyStatus = 'Delivered';
    else if (status === 'READY_FOR_DELIVERY' || status === 'ASSIGNED' || status === 'IN_TRANSIT') order.legacyStatus = 'Shipped';
    if (reason) {
      order.deliveryNotes = reason;
    }
    await order.save();

    // Notify customer
    if (order.customerId) {
      await notifyUser(String(order.customerId), {
        title: 'Order status changed',
        body: `Your order #${String(order._id).slice(-6).toUpperCase()} status changed from ${oldStatus} to ${status}.`,
        orderId: order._id,
        type: 'order_status'
      });
    }

res.status(200).json({
      success: true,
      data: order,
      message: `Order status set to ${status}`,
      previousStatus: oldStatus
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin: Update order status (PATCH) - auto-creates Delivery when confirmed
// @route   PATCH /api/orders/:id/status
// @access  Private Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const statusAliases = {
      pending: 'PENDING',
      confirmed: 'CONFIRMED',
      cancelled: 'CANCELLED',
      canceled: 'CANCELLED',
      ready_for_delivery: 'READY_FOR_DELIVERY',
      ready: 'READY_FOR_DELIVERY',
      assigned: 'ASSIGNED',
      in_transit: 'IN_TRANSIT',
      delivered: 'DELIVERED',
      completed: 'DELIVERED',
      failed_delivery: 'FAILED_DELIVERY'
    };

    const rawStatus = (status || '').toString().trim();
    const normalizedKey = rawStatus.toLowerCase().replace(/[\s-]+/g, '_');
    const nextStatus = statusAliases[normalizedKey] || rawStatus.toUpperCase();
    const validStatuses = [
      'PENDING',
      'CONFIRMED',
      'CANCELLED',
      'READY_FOR_DELIVERY',
      'ASSIGNED',
      'IN_TRANSIT',
      'DELIVERED',
      'FAILED_DELIVERY'
    ];
    if (!validStatuses.includes(nextStatus)) {
      return res.status(400).json({ message: `Invalid status. Valid: ${validStatuses.join(', ')}` });
    }

    const oldStatus = order.status;
    
    // If cancelling, restore stock
    if (nextStatus === 'CANCELLED' && oldStatus !== 'CANCELLED') {
      await restoreDeductedStock(order);
    }

    order.status = nextStatus;
    if (nextStatus === 'CANCELLED') order.legacyStatus = 'Cancelled';
    else if (nextStatus === 'DELIVERED') order.legacyStatus = 'Delivered';
    else if (nextStatus === 'IN_TRANSIT') order.legacyStatus = 'Shipped';
    else if (nextStatus === 'PENDING') order.legacyStatus = 'Pending';
    else order.legacyStatus = 'Processing';
    if (notes) order.deliveryNotes = notes;
    if (nextStatus === 'DELIVERED' && !order.deliveredAt) order.deliveredAt = new Date();
    await order.save();

    if (
      ['CONFIRMED', 'READY_FOR_DELIVERY', 'ASSIGNED', 'IN_TRANSIT'].includes(nextStatus) &&
      oldStatus !== nextStatus
    ) {
      await ensureDeliveryForOrder(order);
    }

    // Notify customer
    if (order.customerId) {
      await notifyUser(String(order.customerId), {
        title: 'Order status updated',
        body: `Order #${String(order._id).slice(-6).toUpperCase()} is now ${nextStatus}.`,
        orderId: order._id,
        type: 'order_status'
      });
    }

    res.status(200).json({
      success: true,
      data: order,
      message: `Order status updated to ${nextStatus}`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders (admin only)
// @route   GET /api/orders
// @access  Private Admin
exports.getAllOrders = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 100 } = req.query;
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 200);
    const skip = (pageNumber - 1) * limitNumber;

    const filter = {};
    if (status) filter.status = String(status).toUpperCase();
    if (search && String(search).trim()) {
      const q = String(search).trim();
      filter.$or = [{ customerName: { $regex: q, $options: 'i' } }];
      if (/^[a-fA-F0-9]{24}$/.test(q)) {
        filter.$or.push({ _id: q });
      }
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
      .populate('customerId', 'name email')
        .populate('deliveryAgentId', 'name email')
        .populate('items.stockId', 'name category unit pricePerKg status availabilityStatus')
        .populate('items.farmerId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      Order.countDocuments(filter)
    ]);
    
    res.status(200).json({ 
      success: true, 
      count: orders.length,
      total,
      page: pageNumber,
      pages: Math.ceil(total / limitNumber),
      data: orders
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
