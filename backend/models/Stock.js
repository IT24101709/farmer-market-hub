const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false // Optional to prevent breaking existing stocks
  },
  vegetableName: {
    type: String,
    required: true,
    trim: true
  },
  harvestDate: {
    type: Date,
    required: true
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
  minPriceLimit: {
    type: Number,
    default: 0
  },
  maxPriceLimit: {
    type: Number,
    default: Infinity
  },
  status: {
    type: String,
    enum: ['Available', 'Low Stock', 'Out of Stock', 'Expired', 'Frozen'],
    default: 'Available'
  },
  expiryDate: {
    type: Date,
    required: true
  },
  image: {
    type: String, // URL or file path
    required: true
  },
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  visibility: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  removalReason: {
    type: String,
    default: ''
  },
  sku: {
    type: String,
    sparse: true,
    unique: true
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicates (farmer + vegetable + harvestDate)
stockSchema.index({ farmerId: 1, vegetableName: 1, harvestDate: 1 }, { unique: true });

// Performance indexes
stockSchema.index({ farmerId: 1, vegetableName: 1, status: 1 });
stockSchema.index({ quantity: 1, status: 1 }); // For low stock queries
stockSchema.index({ isDeleted: 1 }); // Soft delete filter
stockSchema.index({ expiryDate: 1 }); // Expired cleanup

// Text index for fuzzy search across products
stockSchema.index({ vegetableName: 'text', sku: 'text' });

module.exports = mongoose.model('Stock', stockSchema);
