const Order = require('../models/Order');

// @desc    Create a new order
// @route   POST /api/orders
// @access  Public
exports.createOrder = async (req, res) => {
  try {
    const { customerName, items, status } = req.body;

    // Validate required fields
    if (!customerName || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide customerName and at least one item'
      });
    }

    // Calculate totalAmount
    const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const order = await Order.create({
      customerName,
      items,
      totalAmount,
      status: status || 'Pending'
    });

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Public
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Public
exports.getSingleOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Public
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, items, status } = req.body;

    let order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update fields if provided
    if (customerName) order.customerName = customerName;
    if (items && items.length > 0) {
      order.items = items;
      order.totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }
    if (status) order.status = status;

    order = await order.save();

    res.status(200).json({
      success: true,
      data: order,
      message: 'Order updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Public
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {},
      message: 'Order deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
