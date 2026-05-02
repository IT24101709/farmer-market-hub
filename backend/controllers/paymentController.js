import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { User } from "../models/User.js";
import { getNextSequence } from "../utils/counter.js";

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function sanitizeCsv(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/,/g, " ");
}

function mapPaymentResponse(payment, order) {
  return {
    paymentId: payment?.paymentId ?? null,
    orderId: order.orderId,
    transactionId: payment?.transactionReference ?? `REJECTED-ORD${order.orderId}`,
    paymentStatus: payment?.paymentStatus ?? "FAILED",
    paymentMethod: payment?.paymentMethod ?? "N/A",
    amountPaid: order.totalAmount,
    paymentDate: payment?.paymentDate ?? order.orderDate
  };
}

function isValidLuhn(cardNumber) {
  if (!cardNumber) return false;
  let sum = 0;
  let alternate = false;
  for (let i = cardNumber.length - 1; i >= 0; i -= 1) {
    let n = Number(cardNumber[i]);
    if (alternate) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

function validateCard(payload) {
  const method = String(payload.paymentMethod || "").toUpperCase();
  if (method !== "CREDIT/DEBIT CARD" && method !== "CARD") {
    return true;
  }

  if (!/^\d{12,19}$/.test(String(payload.cardNumber || ""))) return false;
  if (!/^\d{3,4}$/.test(String(payload.cvv || ""))) return false;
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(String(payload.expiryDate || ""))) return false;

  return isValidLuhn(String(payload.cardNumber));
}

function generateTransactionId() {
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `TXN${random}`;
}

export async function processPayment(req, res, next) {
  try {
    const { orderId, paymentMethod } = req.body;

    if (!orderId) {
      throw badRequest("orderId is required.");
    }

    if (!paymentMethod || !String(paymentMethod).trim()) {
      throw badRequest("paymentMethod is required.");
    }

    const order = await Order.findOne({ orderId: Number(orderId) });
    if (!order) {
      throw badRequest(`Order not found for id: ${orderId}`);
    }

    if (String(order.status).toUpperCase() !== "APPROVED") {
      throw badRequest("Order is not approved by admin yet.");
    }

    const existing = await Payment.findOne({ orderId: order.orderId });
    if (existing) {
      throw badRequest(`Payment already exists for order: ${order.orderId}`);
    }

    const success = validateCard(req.body);
    const paymentStatus = success ? "SUCCESS" : "FAILED";

    const paymentId = await getNextSequence("paymentId");

    const payment = await Payment.create({
      paymentId,
      orderId: order.orderId,
      paymentMethod,
      paymentStatus,
      transactionReference: generateTransactionId()
    });

    order.status = success ? "PAID" : "PAYMENT_FAILED";
    await order.save();

    res.json(mapPaymentResponse(payment, order));
  } catch (error) {
    next(error);
  }
}

export async function getPaymentById(req, res, next) {
  try {
    const paymentId = Number(req.params.paymentId);
    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
      throw badRequest(`Payment not found for id: ${req.params.paymentId}`);
    }

    const order = await Order.findOne({ orderId: payment.orderId });
    if (!order) {
      throw notFound(`Order not found for id: ${payment.orderId}`);
    }

    res.json(mapPaymentResponse(payment, order));
  } catch (error) {
    next(error);
  }
}

export async function getPaymentByOrderId(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      throw badRequest(`Payment not found for order id: ${req.params.orderId}`);
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      throw notFound(`Order not found for id: ${orderId}`);
    }

    res.json(mapPaymentResponse(payment, order));
  } catch (error) {
    next(error);
  }
}

export async function getOverview(req, res, next) {
  try {
    const [orders, payments] = await Promise.all([
      Order.find().sort({ orderDate: -1 }),
      Payment.find().sort({ paymentDate: -1 })
    ]);

    const paymentByOrderId = new Map(payments.map((payment) => [payment.orderId, payment]));
    const rejectedOrders = orders.filter((order) => String(order.status).toUpperCase() === "REJECTED");

    const successCount = payments.filter((payment) => String(payment.paymentStatus).toUpperCase() === "SUCCESS").length;
    const paymentFailedCount = payments.filter((payment) => String(payment.paymentStatus).toUpperCase() === "FAILED").length;
    const failedTransactions = paymentFailedCount + rejectedOrders.length;

    const paymentHistory = payments
      .map((payment) => {
        const order = orders.find((item) => item.orderId === payment.orderId);
        return order ? mapPaymentResponse(payment, order) : null;
      })
      .filter(Boolean);

    const rejectedHistory = rejectedOrders.map((order) => mapPaymentResponse(null, order));

    const transactionHistory = [...paymentHistory, ...rejectedHistory].sort(
      (a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)
    );

    res.json({
      totalTransactions: successCount + failedTransactions,
      successfulTransactions: successCount,
      failedTransactions,
      transactionHistory
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerDashboardCards(req, res, next) {
  try {
    const [orders, users, payments] = await Promise.all([
      Order.find().sort({ orderDate: -1 }).limit(50),
      User.find(),
      Payment.find()
    ]);

    const usersById = new Map(users.map((user) => [user.userId, user]));
    const paymentsByOrderId = new Map(payments.map((payment) => [payment.orderId, payment]));

    const cards = orders
      .filter((order) => {
        const customer = usersById.get(order.customerId);
        return customer && String(customer.role).toUpperCase() === "CUSTOMER";
      })
      .map((order) => {
        const customer = usersById.get(order.customerId);
        const payment = paymentsByOrderId.get(order.orderId);
        const paymentStatus = payment?.paymentStatus ?? "NOT_PAID";
        const approved = String(order.status).toUpperCase() === "APPROVED";

        return {
          userId: customer.userId,
          name: customer.name,
          email: customer.email,
          orderId: order.orderId,
          totalAmount: order.totalAmount,
          orderStatus: order.status,
          paymentStatus,
          canProcessPayment: approved && String(paymentStatus).toUpperCase() !== "SUCCESS"
        };
      });

    res.json(cards);
  } catch (error) {
    next(error);
  }
}

export async function getAdminRequests(req, res, next) {
  try {
    const [orders, users, payments] = await Promise.all([
      Order.find().sort({ orderDate: -1 }).limit(50),
      User.find(),
      Payment.find()
    ]);

    const usersById = new Map(users.map((user) => [user.userId, user]));
    const paymentsByOrderId = new Map(payments.map((payment) => [payment.orderId, payment]));

    const rows = orders.map((order) => {
      const customer = usersById.get(order.customerId);
      return {
        orderId: order.orderId,
        customerName: customer?.name ?? "Unknown",
        customerEmail: customer?.email ?? "unknown@example.com",
        amount: order.totalAmount,
        orderStatus: order.status,
        paymentStatus: paymentsByOrderId.get(order.orderId)?.paymentStatus ?? "NOT_PAID",
        orderDate: order.orderDate
      };
    });

    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function approveOrder(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
    const order = await Order.findOne({ orderId });
    if (!order) {
      throw badRequest(`Order not found for id: ${req.params.orderId}`);
    }

    order.status = "APPROVED";
    await order.save();

    res.status(200).send();
  } catch (error) {
    next(error);
  }
}

export async function rejectOrder(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
    const order = await Order.findOne({ orderId });
    if (!order) {
      throw badRequest(`Order not found for id: ${req.params.orderId}`);
    }

    order.status = "REJECTED";
    await order.save();

    res.status(200).send();
  } catch (error) {
    next(error);
  }
}

export async function downloadAdminReport(req, res, next) {
  try {
    const [orders, users, payments] = await Promise.all([
      Order.find().sort({ orderDate: -1 }).limit(50),
      User.find(),
      Payment.find()
    ]);

    const usersById = new Map(users.map((user) => [user.userId, user]));
    const paymentsByOrderId = new Map(payments.map((payment) => [payment.orderId, payment]));

    const header = "Order ID,Customer Name,Customer Email,Amount,Order Status,Payment Status,Order Date\n";
    const body = orders
      .map((order) => {
        const customer = usersById.get(order.customerId);
        const paymentStatus = paymentsByOrderId.get(order.orderId)?.paymentStatus ?? "NOT_PAID";
        return [
          order.orderId,
          sanitizeCsv(customer?.name),
          sanitizeCsv(customer?.email),
          Number(order.totalAmount || 0).toFixed(2),
          sanitizeCsv(order.status),
          sanitizeCsv(paymentStatus),
          order.orderDate ? new Date(order.orderDate).toISOString() : ""
        ].join(",");
      })
      .join("\n");

    const filename = `payment-report-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    res.setHeader("Content-Type", "text/csv");
    res.send(header + body);
  } catch (error) {
    next(error);
  }
}
