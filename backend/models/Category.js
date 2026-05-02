const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  /** Must match Stock.category enum (e.g. leafy-greens, fruiting). Canonical rows are seeded with slug. */
  slug: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true
  },
  minPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 5
  },
  maxPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 500
  }
}, {
  timestamps: true
});

// Index for price queries
categorySchema.index({ name: 1, minPrice: 1, maxPrice: 1 });

module.exports = mongoose.model('Category', categorySchema);
