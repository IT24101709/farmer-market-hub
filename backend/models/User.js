const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['Admin', 'Farmer', 'Customer', 'DeliveryAgent'],
    default: 'Customer'
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended'],
    default: 'Active'
  },
  // Additional details can be added later (address, phone, business name for farmers)
  profileDetails: {
    phone: String,
    address: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
