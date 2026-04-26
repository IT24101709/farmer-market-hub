const mongoose = require('mongoose');

const stockHistorySchema = new mongoose.Schema({
  stockId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stock',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    enum: ['CREATED', 'UPDATED', 'DELETED', 'STATUS_CHANGE', 'BULK_ADDED', 'BULK_UPDATED'],
    required: true,
  },
  changes: {
    type: Object, // Store what changed e.g. { quantity: { old: 50, new: 0 }, status: { old: 'Available', new: 'Out of Stock' } }
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

// Index for quick retrieval of a stock's history
stockHistorySchema.index({ stockId: 1, timestamp: -1 });

module.exports = mongoose.model('StockHistory', stockHistorySchema);
