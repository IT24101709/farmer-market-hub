const Payment = require('../models/Payment');
const Order = require('../models/Order');

function generateTransactionRef() {
  return `TXN${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

const populatePayment = (query) =>
  query
    .populate('orderId', 'totalAmount customerName status items deliveryAddress note createdAt updatedAt')
    .populate('customerId', 'name email profileDetails');

// @desc    Process payment for a confirmed order (customer only)
// @route   POST /api/payments/process
// @access  Private Customer
exports.processPayment = async (req, res) => {
  try {
    const { orderId, paymentMethod, note } = req.body;
    const customerId = req.user._id || req.user.id;

    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }
    if (!paymentMethod) {
      return res.status(400).json({ message: 'paymentMethod is required' });
    }

    const validMethods = ['CASH', 'CARD', 'BANK_TRANSFER'];
    if (!validMethods.includes(String(paymentMethod).toUpperCase())) {
      return res.status(400).json({ message: `Invalid payment method. Valid: ${validMethods.join(', ')}` });
    }

    // Find order by MongoDB _id
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Ownership check — only the order's customer can pay
    if (String(order.customerId) !== String(customerId)) {
      return res.status(403).json({ message: 'You can only pay for your own orders' });
    }

    // Order must be CONFIRMED (farmer has accepted) before payment
    if (order.status !== 'CONFIRMED') {
      return res.status(400).json({
        message: `Order must be CONFIRMED before payment. Current status: ${order.status}`
      });
    }

    // Prevent duplicate payment
    const existing = await Payment.findOne({ orderId });
    if (existing) {
      return res.status(400).json({ message: 'Payment already exists for this order' });
    }

    const payment = await Payment.create({
      orderId,
      customerId,
      paymentMethod: String(paymentMethod).toUpperCase(),
      paymentStatus: String(paymentMethod).toUpperCase() === 'CASH' ? 'PENDING' : 'SUCCESS',
      transactionReference: generateTransactionRef(),
      amount: order.totalAmount,
      note: note || ''
    });

    // Populate for response
    const populated = await populatePayment(Payment.findById(payment._id));

    res.status(201).json({
      success: true,
      data: populated,
      message: 'Payment processed successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin updates a payment status
// @route   PATCH /api/payments/:id/status
// @access  Private Admin
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, note } = req.body;
    const normalizedStatus = String(paymentStatus || '').toUpperCase();
    const validStatuses = ['PENDING', 'SUCCESS', 'FAILED'];

    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ message: `Invalid payment status. Valid: ${validStatuses.join(', ')}` });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    payment.paymentStatus = normalizedStatus;
    if (typeof note === 'string') {
      payment.note = note.trim();
    }
    await payment.save();

    const populated = await populatePayment(Payment.findById(payment._id));

    res.status(200).json({
      success: true,
      data: populated,
      message: `Payment status updated to ${normalizedStatus}`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all payments with stats (admin only)
// @route   GET /api/payments/overview
// @access  Private Admin
exports.getOverview = async (req, res) => {
  try {
    const { status, method, search, page = 1, limit = 200 } = req.query;
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 500);
    const skip = (pageNumber - 1) * limitNumber;

    const filter = {};
    if (status && status !== 'ALL') filter.paymentStatus = String(status).toUpperCase();
    if (method && method !== 'ALL') filter.paymentMethod = String(method).toUpperCase();
    if (search && String(search).trim()) {
      const q = String(search).trim();
      filter.$or = [{ transactionReference: { $regex: q, $options: 'i' } }];
      if (/^[a-fA-F0-9]{24}$/.test(q)) {
        filter.$or.push({ _id: q }, { orderId: q }, { customerId: q });
      }
    }

    const [payments, total, allPayments] = await Promise.all([
      populatePayment(
        Payment.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNumber)
      ),
      Payment.countDocuments(filter),
      Payment.find().select('paymentStatus amount').lean()
    ]);

    const stats = {
      total: allPayments.length,
      success: allPayments.filter(p => p.paymentStatus === 'SUCCESS').length,
      failed: allPayments.filter(p => p.paymentStatus === 'FAILED').length,
      pending: allPayments.filter(p => p.paymentStatus === 'PENDING').length,
      totalRevenue: allPayments
        .filter(p => p.paymentStatus === 'SUCCESS')
        .reduce((sum, p) => sum + (p.amount || 0), 0)
    };

    res.status(200).json({
      success: true,
      data: payments,
      stats,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get customer's own payment history
// @route   GET /api/payments/my
// @access  Private Customer
exports.getMyPayments = async (req, res) => {
  try {
    const customerId = req.user._id || req.user.id;

    const payments = await populatePayment(
      Payment.find({ customerId }).sort({ createdAt: -1 })
    );

    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get payment by order ID
// @route   GET /api/payments/order/:orderId
// @access  Private
exports.getPaymentByOrderId = async (req, res) => {
  try {
    const payment = await populatePayment(Payment.findOne({ orderId: req.params.orderId }));

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found for this order' });
    }

    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get payment by payment ID
// @route   GET /api/payments/:id
// @access  Private
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await populatePayment(Payment.findById(req.params.id));

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete payment record (admin only)
// @route   DELETE /api/payments/:id
// @access  Private Admin
exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    await Payment.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
