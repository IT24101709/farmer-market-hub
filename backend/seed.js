import dotenv from "dotenv";
import { connectDatabase } from "../src/config/db.js";
import { Counter } from "../src/models/Counter.js";
import { Order } from "../src/models/Order.js";
import { Payment } from "../src/models/Payment.js";
import { User } from "../src/models/User.js";
import { ordersSeed, paymentsSeed, usersSeed } from "../src/data/seedData.js";

dotenv.config();

async function seed() {
  await connectDatabase();

  await Promise.all([
    Payment.deleteMany({}),
    Order.deleteMany({}),
    User.deleteMany({}),
    Counter.deleteMany({})
  ]);

  await User.insertMany(usersSeed);
  await Order.insertMany(ordersSeed);
  await Payment.insertMany(paymentsSeed);

  await Counter.create([
    { _id: "userId", seq: Math.max(...usersSeed.map((user) => user.userId)) },
    { _id: "orderId", seq: Math.max(...ordersSeed.map((order) => order.orderId)) },
    { _id: "paymentId", seq: Math.max(...paymentsSeed.map((payment) => payment.paymentId)) }
  ]);

  console.log("Seed completed");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
