const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { notifyUser } = require('../utils/orderNotifications');

const uid = (user) => String(user?.id || user?._id || '');

// @desc    Create delivery (admin only)
// @route   POST /api/deliveries
// @access  Private Admin
exports.createDelivery = async (req, res) => {
  try {
    const { orderId, customerId, deliveryAddress } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    // Check order exists and is confirmed
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'CONFIRMED' && order.status !== 'confirmed') {
      return res.status(400).json({ message: 'Order must be confirmed before creating delivery' });
    }

    // Check if delivery already exists
    const existingDelivery = await Delivery.findOne({ orderId });
    if (existingDelivery) {
      return res.status(400).json({ message: 'Delivery already exists for this order' });
    }

    const delivery = await Delivery.create({
      orderId,
      customerId: customerId || order.customerId,
      deliveryAddress: deliveryAddress || order.deliveryAddress || 'Address not provided',
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      data: delivery,
      message: 'Delivery created successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all deliveries (admin only)
// @route   GET /api/deliveries
// @access  Private Admin
exports.getAllDeliveries = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    const deliveries = await Delivery.find(filter)
      .populate('orderId', 'items totalAmount')
      .populate('agentId', 'name email')
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get agent's deliveries (agent only)
// @route   GET /api/deliveries/my
// @access  Private DeliveryAgent
exports.getMyDeliveries = async (req, res) => {
  try {
    const agentId = uid(req.user);

    const deliveries = await Delivery.find({ agentId })
      .populate('orderId', 'items totalAmount')
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get delivery by ID
// @route   GET /api/deliveries/:id
// @access  Private
exports.getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('orderId', 'items totalAmount customerName')
      .populate('agentId', 'name email')
      .populate('customerId', 'name email');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    const userId = uid(req.user);
    const isAdmin = req.user.role === 'Admin';
    const isAgent = String(delivery.agentId?._id || delivery.agentId) === userId;
    const isCustomer = String(delivery.customerId?._id || delivery.customerId) === userId;

    if (!isAdmin && !isAgent && !isCustomer) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({
      success: true,
      data: delivery
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get delivery by order ID
// @route   GET /api/deliveries/order/:orderId
// @access  Private
exports.getDeliveryByOrderId = async (req, res) => {
  try {
    const delivery = await Delivery.findOne({ orderId: req.params.orderId })
      .populate('orderId', 'items totalAmount customerName')
      .populate('agentId', 'name email')
      .populate('customerId', 'name email');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found for this order' });
    }

    const userId = uid(req.user);
    const isAdmin = req.user.role === 'Admin';
    const isAgent = String(delivery.agentId?._id || delivery.agentId) === userId;
    const isCustomer = String(delivery.customerId?._id || delivery.customerId) === userId;

    if (!isAdmin && !isAgent && !isCustomer) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({
      success: true,
      data: delivery
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Assign agent to delivery (admin only)
// @route   PATCH /api/deliveries/:id/assign
// @access  Private Admin
exports.assignAgent = async (req, res) => {
  try {
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ message: 'Agent ID is required' });
    }

    // Check agent exists and has agent role
    const agent = await User.findById(agentId);
    if (!agent || (agent.role !== 'DeliveryAgent' && agent.role !== 'agent')) {
      return res.status(400).json({ message: 'Invalid delivery agent' });
    }

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.status !== 'pending') {
      return res.status(400).json({ message: 'Can only assign to pending deliveries' });
    }

    delivery.agentId = agentId;
    delivery.status = 'assigned';
    delivery.assignedAt = new Date();
    await delivery.save();

    // Notify agent
    await notifyUser(agentId, {
      title: 'New delivery assigned',
      body: `You have been assigned a new delivery. Order #${String(delivery.orderId).slice(-6).toUpperCase()}`,
      deliveryId: delivery._id,
      type: 'delivery_assigned'
    });

    res.status(200).json({
      success: true,
      data: delivery,
      message: 'Agent assigned successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update delivery status (agent only)
// @route   PATCH /api/deliveries/:id/status
// @access  Private DeliveryAgent
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    const userId = uid(req.user);
    const isAssignedAgent = String(delivery.agentId) === userId;

    if (!isAssignedAgent && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only assigned agent can update status' });
    }

    // Validate status transitions
    const validTransitions = {
      'assigned': 'in-transit',
      'in-transit': 'delivered'
    };

    const currentStatus = delivery.status;
    const allowedNextStatus = validTransitions[currentStatus];

    if (!allowedNextStatus || status !== allowedNextStatus) {
      return res.status(400).json({
        message: `Invalid status transition from ${currentStatus}. Next status must be ${allowedNextStatus}`
      });
    }

    // Update status and timestamps
    delivery.status = status;
    if (status === 'in-transit') {
      delivery.pickedUpAt = new Date();
    } else if (status === 'delivered') {
      delivery.deliveredAt = new Date();
      
      // Update linked Order status to completed
      const order = await Order.findByIdAndUpdate(delivery.orderId, { 
        status: 'DELIVERED',
        legacyStatus: 'Delivered'
      }, { new: true });

      const existingPayment = await Payment.findOne({ orderId: delivery.orderId });
      if (existingPayment) {
        if (existingPayment.paymentStatus === 'PENDING') {
          existingPayment.paymentStatus = 'SUCCESS';
          existingPayment.note = [existingPayment.note, 'Auto-marked paid after delivery']
            .filter(Boolean)
            .join(' | ');
          await existingPayment.save();
        }
      } else if (order?.customerId) {
        await Payment.create({
          orderId: order._id,
          customerId: order.customerId,
          paymentMethod: 'CASH',
          paymentStatus: 'SUCCESS',
          transactionReference: `COD${String(order._id).slice(-8).toUpperCase()}`,
          amount: order.totalAmount,
          note: 'Auto-created as paid after delivery'
        });
      }

      // Notify customer
      if (delivery.customerId) {
        await notifyUser(String(delivery.customerId), {
          title: 'Order delivered',
          body: `Your order has been delivered! Thank you for your purchase.`,
          orderId: delivery.orderId,
          type: 'order_delivered'
        });
      }
    }

    await delivery.save();

    res.status(200).json({
      success: true,
      data: delivery,
      message: `Delivery status updated to ${status}`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel delivery (admin only)
// @route   PATCH /api/deliveries/:id/cancel
// @access  Private Admin
exports.cancelDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.status !== 'pending' && delivery.status !== 'assigned') {
      return res.status(400).json({
        message: 'Can only cancel pending or assigned deliveries'
      });
    }

    delivery.status = 'cancelled';
    await delivery.save();

    // Notify agent if one was assigned
    if (delivery.agentId) {
      await notifyUser(String(delivery.agentId), {
        title: 'Delivery cancelled',
        body: `Delivery #${String(delivery._id).slice(-6).toUpperCase()} has been cancelled.`,
        type: 'delivery_cancelled'
      });
    }

    res.status(200).json({
      success: true,
      data: delivery,
      message: 'Delivery cancelled'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending shipments for admin to assign
// @route   GET /api/admin/shipments/pending
// @access  Private Admin
exports.getPendingShipments = async (req, res) => {
  try {
    const Order = require('../models/Order');
    const orders = await Order.find({ status: 'CONFIRMED' })
      .select('customerName totalAmount items status createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          total: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: 0,
      pending: 0,
      assigned: 0,
      'in-transit': 0,
      delivered: 0,
      cancelled: 0
    };

    stats.forEach(s => {
      result[s._id] = s.total;
      result.total += s.total;
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get delivery agents (admin)
// @route   GET /api/admin/delivery-agents
// @access  Private Admin
exports.getDeliveryAgents = async (req, res) => {
  try {
    const agents = await User.find({ 
      $or: [{ role: 'DeliveryAgent' }, { role: 'agent' }]
    }).select('name email profileDetails');

    res.status(200).json({ success: true, data: agents });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
