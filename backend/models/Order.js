const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  stockId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Stock',
    required: true
  },
  product: {
    type: String,
    required: [true, 'Please provide a product name']
  },
  quantity: {
    type: Number,
    required: [true, 'Please provide quantity'],
    min: 0.1
  },
  price: {
    type: Number,
    required: [true, 'Please provide price per unit']
  },
  farmerId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  farmerConfirmed: { type: Boolean, default: false },
  farmerConfirmedAt: { type: Date, default: null },
  stockDeducted: { type: Boolean, default: false }
}, { _id: true }
);

const orderSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: [true, 'Please provide a customer name'],
    trim: true,
    minlength: 2
  },
  customerId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  items: {
    type: [orderItemSchema],
    validate: [(v) => Array.isArray(v) && v.length > 0, 'Order must have at least one item']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Please provide total amount']
  },
  // Step-by-step status flow:
  // PENDING → CONFIRMED → READY_FOR_DELIVERY → ASSIGNED → IN_TRANSIT → DELIVERED (or FAILED_DELIVERY)
  status: {
    type: String,
    enum: [
      'PENDING',           // Step 1: Order created by customer
      'CONFIRMED',         // Step 2: Stock checked and confirmed (ready for delivery)
      'CANCELLED',        // Step 2: Stock not available
      'READY_FOR_DELIVERY', // Step 3: Ready for delivery module
      'ASSIGNED',         // Step 4: Delivery agent assigned
      'IN_TRANSIT',       // Step 5: Agent started delivery
      'DELIVERED',        // Step 6: Delivery completed
      'FAILED_DELIVERY'    // Delivery failed
    ],
    default: 'PENDING'
  },
  // Delivery tracking fields
  deliveryAgentId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
  },
  deliveryAssignedAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  deliveryNotes: {
    type: String,
    default: null
  },
  // Customer-provided delivery address and note
  deliveryAddress: {
    type: String,
    default: ''
  },
  note: {
    type: String,
    default: ''
  },
  // Legacy status mapping for backward compatibility
  legacyStatus: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  }
}, { timestamps: true }
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'items.farmerId': 1 });
orderSchema.index({ deliveryAgentId: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
