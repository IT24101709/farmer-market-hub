const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
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
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
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
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending'
    }
  },
  { timestamps: true }
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'items.farmerId': 1 });

module.exports = mongoose.model('Order', orderSchema);
