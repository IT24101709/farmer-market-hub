import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    paymentId: { type: Number, unique: true, index: true },
    paymentMethod: { type: String, required: true, trim: true },
    paymentStatus: { type: String, required: true, trim: true },
    paymentDate: { type: Date, default: Date.now },
    transactionReference: { type: String, trim: true },
    orderId: { type: Number, unique: true, index: true }
  },
  { versionKey: false }
);

export const Payment = mongoose.model("Payment", paymentSchema);
