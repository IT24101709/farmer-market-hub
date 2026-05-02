const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    paymentMethod: {
      type: String,
      required: true,
      trim: true,
      enum: ['CASH', 'CARD', 'BANK_TRANSFER']
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING'
    },
    transactionReference: {
      type: String,
      trim: true
    },
    amount: {
      type: Number,
      required: true
    },
    note: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { timestamps: true }
);

paymentSchema.index({ customerId: 1, createdAt: -1 });
paymentSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
