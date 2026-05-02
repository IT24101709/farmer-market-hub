const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const { notifyUser } = require('../utils/orderNotifications');

const uid = (user) => String(user?.id || user?._id || '');

// @desc    Get delivery agent's dashboard
// @route   GET /api/deliveries/dashboard
// @access  Private DeliveryAgent
exports.getDashboard = async (req, res) => {
  try {
    const agentId = uid(req.user);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayDelivery = await Delivery.findOne({
      agentId,
      date: { $gte: today }
    }).sort({ createdAt: -1 });

    const pendingCount = todayDelivery?.deliveries.filter(d => d.status === 'Pending').length || 0;
    const inTransitCount = todayDelivery?.deliveries.filter(d => d.status === 'In Transit').length || 0;
    const deliveredCount = todayDelivery?.deliveries.filter(d => d.status === 'Delivered').length || 0;

    res.status(200).json({
      success: true,
      data: {
        today: todayDelivery,
        pendingCount,
        inTransitCount,
        deliveredCount,
        totalCount: todayDelivery?.deliveries?.length || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get agent's delivery history
// @route   GET /api/deliveries/history
// @access  Private DeliveryAgent
exports.getHistory = async (req, res) => {
  try {
    const agentId = uid(req.user);
    const { page = 1, limit = 20 } = req.query;
    
    const deliveries = await Delivery.find({ agentId })
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Delivery.countDocuments({ agentId });

    res.status(200).json({
      success: true,
      data: deliveries,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get today's deliveries for agent
// @route   GET /api/deliveries/today
// @access  Private DeliveryAgent
exports.getTodayDeliveries = async (req, res) => {
  try {
    const agentId = uid(req.user);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let delivery = await Delivery.findOne({
      agentId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!delivery) {
      delivery = await Delivery.create({
        agentId,
        deliveries: [],
        date: new Date()
      });
    }

    res.status(200).json({ success: true, data: delivery });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update delivery status (agent updates their delivery)
// @route   PUT /api/deliveries/:deliveryId/item/:itemId
// @access  Private DeliveryAgent
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { deliveryId, itemId } = req.params;
    const { status, notes } = req.body;
    const agentId = uid(req.user);

    const delivery = await Delivery.findOne({ _id: deliveryId, agentId });
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    const item = delivery.deliveries.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Delivery item not found' });
    }

    if (status) {
      item.status = status;
      if (status === 'Delivered') {
        item.deliveredAt = new Date();
        delivery.completedDeliveries = (delivery.completedDeliveries || 0) + 1;
        
        // Update order status to delivered
        await Order.findByIdAndUpdate(item.orderId, { status: 'Delivered' });
        
        // Notify customer
        if (item.customerPhone) {
          await notifyUser(item.customerPhone, {
            title: 'Order delivered',
            body: `Your order #${String(item.orderId).slice(-6).toUpperCase()} has been delivered!`,
            orderId: item.orderId,
            type: 'order_delivered'
          });
        }
      } else if (status === 'In Transit') {
        item.status = 'In Transit';
        
        // Notify customer
        if (item.customerPhone) {
          await notifyUser(item.customerPhone, {
            title: 'Order in transit',
            body: `Your order #${String(item.orderId).slice(-6).toUpperCase()} is on the way!`,
            orderId: item.orderId,
            type: 'order_transit'
          });
        }
      } else if (status === 'Cancelled') {
        item.status = 'Cancelled';
        
        // Notify customer
        if (item.customerPhone) {
          await notifyUser(item.customerPhone, {
            title: 'Delivery cancelled',
            body: `Delivery for order #${String(item.orderId).slice(-6).toUpperCase()} was cancelled.`,
            orderId: item.orderId,
            type: 'delivery_cancelled'
          });
        }
      }
    }

    if (notes) {
      item.notes = notes;
    }

    await delivery.save();

    res.status(200).json({
      success: true,
      data: item,
      message: `Delivery ${status ? `marked ${status}` : 'updated'}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all deliveries (admin only)
// @route   GET /api/admin/deliveries
// @access  Private Admin
exports.getAllDeliveriesAdmin = async (req, res) => {
  try {
    const { status, agentId, date, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) {
      filter['deliveries.status'] = status;
    }
    if (agentId) {
      filter.agentId = agentId;
    }
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.date = { $gte: d, $lt: nextDay };
    }

    const deliveries = await Delivery.find(filter)
      .populate('agentId', 'name email')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Delivery.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: deliveries,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign orders to delivery agent (admin)
// @route   POST /api/admin/deliveries/assign
// @access  Private Admin
exports.assignDelivery = async (req, res) => {
  try {
    const { agentId, orderIds } = req.body;

    if (!agentId || !orderIds?.length) {
      return res.status(400).json({
        success: false,
        message: 'Agent ID and order IDs are required'
      });
    }

    // Get delivery agent's daily record or create new one
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let delivery = await Delivery.findOne({
      agentId,
      date: { $gte: today, $lt: tomorrow }
    });

    const newItems = [];
    for (const orderId of orderIds) {
      const order = await Order.findById(orderId);
      if (!order || order.status !== 'Shipped') continue;

      // Check if already assigned
      if (delivery?.deliveries.some(d => String(d.orderId) === String(orderId))) continue;

      const itemsList = order.items?.map(i => i.product).join(', ') || 'Items';
      
      newItems.push({
        orderId: order._id,
        customerName: order.customerName,
        customerAddress: order.items?.[0]?.stockId || 'Address',
        customerPhone: order.customerId,
        items: itemsList,
        amount: order.totalAmount,
        status: 'Pending'
      });

      // Update order to shipped
      await Order.findByIdAndUpdate(orderId, { status: 'Shipped' });
    }

    if (delivery) {
      delivery.deliveries.push(...newItems);
      delivery.totalDeliveries = (delivery.totalDeliveries || 0) + newItems.length;
    } else {
      delivery = await Delivery.create({
        agentId,
        deliveries: newItems,
        totalDeliveries: newItems.length,
        completedDeliveries: 0,
        date: new Date()
      });
    }

    await delivery.save();

    // Notify agent
    await notifyUser(agentId, {
      title: 'New deliveries assigned',
      body: `${newItems.length} new delivery ${newItems.length === 1 ? 'order' : 'orders'} assigned to you today.`,
      type: 'delivery_assigned'
    });

    res.status(201).json({
      success: true,
      data: delivery,
      message: `${newItems.length} delivery ${newItems.length === 1 ? 'order' : 'orders'} assigned`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all delivery agents (admin)
// @route   GET /api/admin/delivery-agents
// @access  Private Admin
exports.getDeliveryAgents = async (req, res) => {
  try {
    const User = require('../models/User');
    const agents = await User.find({ role: 'DeliveryAgent', status: 'Active' })
      .select('name email profileDetails.phone profileDetails.region');
    
    res.status(200).json({ success: true, data: agents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get pending shipments for admin to assign
// @route   GET /api/admin/shipments/pending
// @access  Private Admin
exports.getPendingShipments = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'Processing' })
      .select('customerName totalAmount items status createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get delivery statistics (admin)
// @route   GET /api/admin/deliveries/stats
// @access  Private Admin
exports.getDeliveryStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const stats = await Delivery.aggregate([
      {
        $match: {
          date: { $gte: startDate }
        }
      },
      {
        $unwind: '$deliveries'
      },
      {
        $group: {
          _id: '$agentId',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$deliveries.status', 'Delivered'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$deliveries.status', 'Pending'] }, 1, 0] }
          },
          inTransit: {
            $sum: { $cond: [{ $eq: ['$deliveries.status', 'In Transit'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'agent'
        }
      },
      {
        $unwind: '$agent'
      },
      {
        $project: {
          agentName: '$agent.name',
          total: 1,
          completed: 1,
          pending: 1,
          inTransit: 1
        }
      }
    ]);

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark order as shipped (farmer)
// @route   PUT /api/deliveries/ship/:orderId
// @access  Private Farmer
exports.shipOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const farmerId = uid(req.user);

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if farmer is part of this order
    const isFarmer = order.items?.some(i => String(i.farmerId) === farmerId);
    if (!isFarmer && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (order.status !== 'Processing') {
      return res.status(400).json({
        success: false,
        message: 'Order must be Processing to ship'
      });
    }

    order.status = 'Shipped';
    await order.save();

    // Notify customer
    if (order.customerId) {
      await notifyUser(String(order.customerId), {
        title: 'Order shipped',
        body: `Your order #${String(order._id).slice(-6).toUpperCase()} has been shipped!`,
        orderId: order._id,
        type: 'order_shipped'
      });
    }

    res.status(200).json({
      success: true,
      data: order,
      message: 'Order marked as shipped'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
