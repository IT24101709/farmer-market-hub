const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['monthly-sales', 'activity-summary'],
    required: true,
    index: true
  },
  period: {
    type: String,
    required: true,
    index: true
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true
});

reportSchema.index({ type: 1, period: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
