const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  stockId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stock',
    required: true,
    index: true
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number between 1 and 5.'
    }
  },
  comment: {
    type: String,
    trim: true,
    minlength: 3,
    maxlength: 600,
    default: ''
  },
  isRemoved: {
    type: Boolean,
    default: false,
    index: true
  },
  removedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  removalReason: {
    type: String,
    trim: true,
    default: ''
  },
  removedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

reviewSchema.index({ customerId: 1, stockId: 1 }, { unique: true });
reviewSchema.index({ farmerId: 1, rating: 1 });

module.exports = mongoose.model('Review', reviewSchema);
