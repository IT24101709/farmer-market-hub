const mongoose = require('mongoose');
const { getNextSequence } = require('../utils/counter');

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
  farmerId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended', 'Blocked', 'Pending Approval'],
    default: 'Active'
  },
  // Farmer approval by admin
  isApproved: {
    type: Boolean,
    default: function() {
      return this.role === 'Farmer' ? false : true; // Farmers need approval, others are auto-approved
    }
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  suspendedUntil: {
    type: Date,
    default: null
  },
  stockFrozenUntil: {
    type: Date,
    default: null  // FSM-04: separate from account suspend
  },
  // Additional details
  profileDetails: {
    contactPerson: {
      type: String,
      trim: true
    },
    region: {
      type: String,
      enum: ['North', 'South', 'East', 'West', 'Central'],
      trim: true
    },
    maxStockLimit: {
      type: Number,
      default: 100
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 15
    },
    address: {
      type: String,
      trim: true,
      maxlength: 200
    },
    businessName: { // For farmers
      type: String,
      trim: true,
      maxlength: 100
    },
    // Delivery Agent capabilities
    maxCapacityKg: {
      type: Number,
      default: 0,
      min: 0
    },
    vehicleType: {
      type: String,
      enum: ['bike', 'van', 'truck', 'tempo'],
      default: null
    },
    serviceCities: [{
      type: String,
      trim: true
    }],
    isActiveAgent: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});


userSchema.pre('validate', async function(next) {
  try {
    if (this.role === 'Farmer' && !this.farmerId) {
      const sequence = await getNextSequence('farmerId');
      this.farmerId = `F${String(sequence).padStart(4, '0')}`;
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema);
