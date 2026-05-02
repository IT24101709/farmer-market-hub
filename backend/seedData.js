export const usersSeed = [
  { userId: 1, name: "Meena", email: "meena@example.com", role: "CUSTOMER" },
  { userId: 2, name: "Kamal", email: "kamal@example.com", role: "CUSTOMER" },
  { userId: 3, name: "Joy", email: "joy@example.com", role: "CUSTOMER" },
  { userId: 4, name: "Sam", email: "sam@example.com", role: "CUSTOMER" },
  { userId: 5, name: "Anu", email: "anu@example.com", role: "CUSTOMER" },
  { userId: 6, name: "Ravi", email: "ravi@example.com", role: "CUSTOMER" },
  { userId: 7, name: "Nila", email: "nila@example.com", role: "CUSTOMER" },
  { userId: 8, name: "Pranav", email: "pranav@example.com", role: "CUSTOMER" },
  { userId: 9, name: "Diya", email: "diya@example.com", role: "CUSTOMER" },
  { userId: 10, name: "Arun", email: "arun@example.com", role: "CUSTOMER" }
];

export const ordersSeed = [
  { orderId: 301, totalAmount: 420.0, status: "PAID", customerId: 1 },
  { orderId: 302, totalAmount: 315.5, status: "APPROVED", customerId: 2 },
  { orderId: 303, totalAmount: 268.75, status: "PENDING_APPROVAL", customerId: 3 },
  { orderId: 304, totalAmount: 190.0, status: "REJECTED", customerId: 4 },
  { orderId: 305, totalAmount: 540.25, status: "PAYMENT_FAILED", customerId: 5 },
  { orderId: 306, totalAmount: 360.0, status: "APPROVED", customerId: 6 },
  { orderId: 307, totalAmount: 289.9, status: "PENDING_APPROVAL", customerId: 7 },
  { orderId: 308, totalAmount: 455.4, status: "PENDING_APPROVAL", customerId: 8 },
  { orderId: 309, totalAmount: 178.25, status: "PENDING_APPROVAL", customerId: 9 },
  { orderId: 310, totalAmount: 399.0, status: "PENDING_APPROVAL", customerId: 10 }
];

export const paymentsSeed = [
  {
    paymentId: 1,
    paymentMethod: "Credit/Debit Card",
    paymentStatus: "SUCCESS",
    transactionReference: "TXNMEEN301",
    orderId: 301
  },
  {
    paymentId: 2,
    paymentMethod: "Credit/Debit Card",
    paymentStatus: "FAILED",
    transactionReference: "TXNANU305",
    orderId: 305
  }
];
