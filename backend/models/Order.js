const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, 'Please provide a customer name'],
      trim: true,
      minlength: 2
    },
    items: [
      {
        stockId: {
          type: mongoose.Schema.ObjectId,
          ref: 'Stock',
          required: true
        },
        product: {
          type: String,
          required: [true, 'Please provide a product name']
        },
        quantity: {
          type: Number,
          required: [true, 'Please provide quantity'],
          min: 0.1
        },
        price: {
          type: Number,
          required: [true, 'Please provide price per unit']
        },
        farmerId: {
          type: mongoose.Schema.ObjectId,
          ref: 'User'
        }
      }
    ],
    totalAmount: {
      type: Number,
      required: [true, 'Please provide total amount']
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
