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
  // Farmer approval by admin
  isApproved: {
    type: Boolean,
    default: function() {
      return this.role === 'Farmer' ? false : true; // Farmers need approval, others are auto-approved
    }
  },
  // Additional details can be added later (address, phone, business name for farmers)
  profileDetails: {
    phone: String,
    address: String,
    businessName: String // For farmers
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
