const mongoose = require('mongoose');

const deliveryItemSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Order',
    required: true
  },
  customerName: String,
  customerAddress: String,
  customerPhone: String,
  items: String, // List of items
  amount: Number,
  status: {
    type: String,
    enum: ['Pending', 'In Transit', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  deliveredAt: Date,
  notes: String
}, { _id: true });

const deliverySchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deliveries: [deliveryItemSchema],
  totalDeliveries: {
    type: Number,
    default: 0
  },
  completedDeliveries: {
    type: Number,
    default: 0
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

deliverySchema.index({ agentId: 1, date: -1 });

module.exports = mongoose.model('Delivery', deliverySchema);
