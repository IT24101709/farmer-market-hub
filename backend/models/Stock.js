const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vegetableName: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  pricePerKg: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Available', 'Out of Stock', 'Expired'],
    default: 'Available'
  },
  expiryDate: {
    type: Date,
    required: true
  },
  image: {
    type: String, // URL or file path
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Stock', stockSchema);
