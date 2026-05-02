const Order = require('../models/Order');
const Stock = require('../models/Stock');
const { notifyUser, notifyFarmersForOrder } = require('../utils/orderNotifications');

const normalizeFarmerId = (f) => {
  if (!f) return null;
  if (typeof f === 'object') return f._id || f.id;
  return f;
};

const uid = (user) => String(user?.id || user?._id || '');

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
    const { customerName, items } = req.body;
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
      stockDeducted: false
    }));

    const totalAmount = normalizedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const customerObjectId = req.user._id || req.user.id;

    const order = await Order.create({
      customerName: customerName.trim(),
      customerId: customerObjectId,
      items: normalizedItems,
      totalAmount,
      status: 'Pending'
    });

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
    const order = await Order.findById(req.params.id);
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
        if (status === 'Cancelled' && order.status !== 'Cancelled') {
          await restoreDeductedStock(order);
          order.status = 'Cancelled';
        } else {
          order.status = status;
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
      if (order.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'Only pending orders can be cancelled by the customer'
        });
      }
      await restoreDeductedStock(order);
      order.status = 'Cancelled';
      await order.save();
      await notifyFarmersForOrder(order, {
        title: 'Order cancelled',
        body: `Order #${String(order._id).slice(-6).toUpperCase()} was cancelled by the customer.`,
        type: 'order_cancelled'
      });
      return res.status(200).json({ success: true, data: order, message: 'Order cancelled' });
    }

    if (isFarmer && status === 'Shipped' && order.status === 'Processing') {
      order.status = 'Shipped';
      await order.save();
      if (order.customerId) {
        await notifyUser(String(order.customerId), {
          title: 'Order shipped',
          body: `Your order #${String(order._id).slice(-6).toUpperCase()} has been marked as shipped.`,
          orderId: order._id,
          type: 'order_status'
        });
      }
      return res.status(200).json({ success: true, data: order, message: 'Order marked shipped' });
    }

    if (isFarmer && status === 'Delivered' && order.status === 'Shipped') {
      order.status = 'Delivered';
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
