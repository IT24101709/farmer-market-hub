const mongoose = require('mongoose');

const { CATEGORY_ENUM } = require('../utils/stockCategory');
// Unit enum
const UNIT_ENUM = ['kg', 'g', 'pcs'];
// Status enum
const STATUS_ENUM = ['Available', 'Low Stock', 'Out of Stock', 'Expired', 'Frozen'];

const stockSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Main name field (renamed from vegetableName)
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 60
  },
  // Category as enum string (in addition to categoryId for backward compatibility)
  category: {
    type: String,
    required: true,
    enum: {
      values: CATEGORY_ENUM,
      message: `Category must be one of: ${CATEGORY_ENUM.join(', ')}`
    }
  },
  // Legacy categoryId reference (optional, kept for backward compatibility)
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false
  },
  // Quantity - required, min 0
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative']
  },
  // Unit field (kg/g/pcs)
  unit: {
    type: String,
    required: true,
    enum: {
      values: UNIT_ENUM,
      message: 'Unit must be one of: {PATH} = kg, g, pcs'
    },
    default: 'kg'
  },
  // Price per unit - required, min 0.01
  pricePerKg: {
    type: Number,
    required: true,
    min: [0.01, 'Price must be at least 0.01']
  },
  // Harvest date
  harvestDate: {
    type: Date,
    required: true
  },
  // Optional description
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  // Image URL
  imageUrl: {
    type: String,
    required: true
  },
  // Quality grade
  qualityGrade: {
    type: String,
    enum: ['A', 'B', 'C'],
    default: 'A'
  },
  // Min/Max price limits from category
  minPriceLimit: {
    type: Number,
    default: 0
  },
  maxPriceLimit: {
    type: Number,
    default: Infinity
  },
  // Stock status
  status: {
    type: String,
    enum: STATUS_ENUM,
    default: 'Available'
  },
  // Availability status - boolean
  availabilityStatus: {
    type: Boolean,
    default: true
  },
  // Expiry date
  expiryDate: {
    type: Date,
    required: true
  },
  // Approval status
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  // Visibility for marketplace
  visibility: {
    type: Boolean,
    default: true
  },
  // Soft delete flag
  isDeleted: {
    type: Boolean,
    default: false
  },
  // Removal reason
  removalReason: {
    type: String,
    default: ''
  },
  // SKU
  sku: {
    type: String,
    sparse: true,
    unique: true
  },
  // Flag for auto-delete when quantity becomes zero
  zeroQtyFlag: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// =======================
// BUSINESS LOGIC HOOKS
// =======================

// Pre-save hook: if quantity===0 → status=false, availabilityStatus=false
stockSchema.pre('save', function(next) {
  const stock = this;
  
  // Handle zero quantity logic
  if (stock.quantity === 0 && stock.isNew) {
    stock.status = 'Out of Stock';
    stock.availabilityStatus = false;
    stock.visibility = false;
    stock.zeroQtyFlag = true;
  }
  
  // Auto-update status based on quantity for existing documents
  if (!stock.isNew && stock.isModified('quantity')) {
    if (stock.quantity === 0) {
      stock.status = 'Out of Stock';
      stock.availabilityStatus = false;
      stock.visibility = false;
      stock.zeroQtyFlag = true;
    } else if (stock.status === 'Out of Stock') {
      stock.status = 'Available';
      stock.availabilityStatus = true;
      stock.visibility = true;
      stock.zeroQtyFlag = false;
    }
  }
  
  // Check expiry date
  if (stock.expiryDate && stock.expiryDate < new Date()) {
    stock.status = 'Expired';
    stock.visibility = false;
  }
  
  next();
});

// Post-save hook: if quantity===0 → flag for auto-delete review
stockSchema.post('save', function(doc) {
  // Flag that quantity is zero for potential auto-delete process
  // This can be used by a scheduled job to review/delete old zero-qty items
  if (doc.quantity === 0) {
    doc.zeroQtyFlag = true;
    doc.save().catch(err => console.error('Post-save zero qty flag error:', err));
  }
});

// =======================
// INDEXES (Performance - NFR-02)
// =======================

// Non-unique index for farmer stock listing (many rows allowed with same name + harvest date — each has its own stock _id).
stockSchema.index({ farmerId: 1, createdAt: -1 });

// Performance indexes for marketplace queries
stockSchema.index({ farmerId: 1, availabilityStatus: 1 });
stockSchema.index({ availabilityStatus: 1, category: 1, pricePerKg: 1 });
stockSchema.index({ availabilityStatus: 1, category: 1 });
stockSchema.index({ quantity: 1, status: 1 }); // For low stock queries

// Soft delete filter
stockSchema.index({ isDeleted: 1 });

// Expired cleanup
stockSchema.index({ expiryDate: 1 });

// Text index for fuzzy search across products
stockSchema.index({ name: 'text', sku: 'text' });

module.exports = mongoose.model('Stock', stockSchema);
