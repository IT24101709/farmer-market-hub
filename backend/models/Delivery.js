const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-transit', 'delivered', 'cancelled'],
    default: 'pending'
  },
  assignedAt: {
    type: Date,
    default: null
  },
  pickedUpAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  note: {
    type: String,
    default: ''
  },
  driverName: {
    type: String,
    default: null
  },
  driverContact: {
    type: String,
    default: null
  },
  driverVehicle: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
deliverySchema.index({ status: 1, createdAt: -1 });
deliverySchema.index({ agentId: 1, status: 1 });

module.exports = mongoose.model('Delivery', deliverySchema);
