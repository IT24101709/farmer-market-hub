const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Report = require('../models/Report');
const Stock = require('../models/Stock');
const User = require('../models/User');

function monthRange(month) {
  const now = new Date();
  const period = /^\d{4}-\d{2}$/.test(String(month || ''))
    ? String(month)
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [year, monthNumber] = period.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return { period, start, end };
}

function escapePdfText(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildSimplePdf(title, lines) {
  const textLines = [title, ...lines].map(escapePdfText);
  const content = [
    'BT',
    '/F1 18 Tf',
    '50 790 Td',
    `(${textLines[0]}) Tj`,
    '/F1 11 Tf',
    ...textLines.slice(1).flatMap((line) => ['0 -18 Td', `(${line}) Tj`]),
    'ET'
  ].join('\n');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${object}\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}

async function buildMonthlySalesReport(month) {
  const { period, start, end } = monthRange(month);
  const dateMatch = { createdAt: { $gte: start, $lt: end } };

  const [payments, orders, topVegetables, topFarmers] = await Promise.all([
    Payment.find(dateMatch).populate('orderId', 'customerName status items').sort({ createdAt: -1 }),
    Order.find(dateMatch).sort({ createdAt: -1 }),
    Order.aggregate([
      { $match: dateMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          orders: { $addToSet: '$_id' }
        }
      },
      { $project: { name: '$_id', quantity: 1, revenue: 1, orderCount: { $size: '$orders' }, _id: 0 } },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]),
    Order.aggregate([
      { $match: dateMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.farmerId',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'farmer'
        }
      },
      { $unwind: { path: '$farmer', preserveNullAndEmptyArrays: true } },
      { $project: { farmerId: '$_id', farmerName: '$farmer.name', quantity: 1, revenue: 1, _id: 0 } }
    ])
  ]);

  const successfulPayments = payments.filter((payment) => payment.paymentStatus === 'SUCCESS');
  const pendingPayments = payments.filter((payment) => payment.paymentStatus === 'PENDING');

  return {
    period,
    totals: {
      orders: orders.length,
      payments: payments.length,
      successfulPayments: successfulPayments.length,
      pendingPayments: pendingPayments.length,
      revenue: successfulPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      orderValue: orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)
    },
    topVegetables,
    topFarmers,
    payments: payments.map((payment) => ({
      id: payment._id,
      orderId: payment.orderId?._id || payment.orderId,
      customerName: payment.orderId?.customerName || '',
      method: payment.paymentMethod,
      status: payment.paymentStatus,
      amount: payment.amount,
      createdAt: payment.createdAt
    }))
  };
}

async function buildActivityReport(month) {
  const { period, start, end } = monthRange(month);
  const dateMatch = { createdAt: { $gte: start, $lt: end } };

  const [usersByRole, usersByStatus, stockCount, orderCount, paymentCount] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    User.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Stock.countDocuments({ isDeleted: false }),
    Order.countDocuments(dateMatch),
    Payment.countDocuments(dateMatch)
  ]);

  return {
    period,
    activeUsers: await User.countDocuments({ status: 'Active' }),
    usersByRole,
    usersByStatus,
    activity: {
      stockListings: stockCount,
      ordersThisMonth: orderCount,
      paymentsThisMonth: paymentCount
    }
  };
}

exports.getMonthlySalesReport = async (req, res) => {
  try {
    const report = await buildMonthlySalesReport(req.query.month);
    await Report.create({
      type: 'monthly-sales',
      period: report.period,
      generatedBy: req.user._id || req.user.id,
      payload: report
    });
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getActivityReport = async (req, res) => {
  try {
    const report = await buildActivityReport(req.query.month);
    await Report.create({
      type: 'activity-summary',
      period: report.period,
      generatedBy: req.user._id || req.user.id,
      payload: report
    });
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.setUserActiveStatus = async (req, res) => {
  try {
    const { active } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (String(user._id) === String(req.user._id || req.user.id)) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    user.status = active ? 'Active' : 'Suspended';
    await user.save();

    res.status(200).json({
      success: true,
      data: { _id: user._id, name: user.name, email: user.email, role: user.role, status: user.status },
      message: `User ${active ? 'activated' : 'deactivated'}`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.exportReport = async (req, res) => {
  try {
    const type = req.query.type === 'activity-summary' ? 'activity-summary' : 'monthly-sales';
    const format = req.query.format === 'pdf' ? 'pdf' : 'json';
    const report = type === 'activity-summary'
      ? await buildActivityReport(req.query.month)
      : await buildMonthlySalesReport(req.query.month);

    if (format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename="${type}-${report.period}.json"`);
      return res.status(200).json({ success: true, data: report });
    }

    const lines = [
      `Period: ${report.period}`,
      ...(type === 'monthly-sales'
        ? [
            `Orders: ${report.totals.orders}`,
            `Revenue: LKR ${Number(report.totals.revenue || 0).toFixed(2)}`,
            `Top vegetables: ${report.topVegetables.map((item) => item.name).slice(0, 5).join(', ') || 'None'}`,
            `Top farmers: ${report.topFarmers.map((item) => item.farmerName || 'Unknown').slice(0, 5).join(', ') || 'None'}`
          ]
        : [
            `Active users: ${report.activeUsers}`,
            `Stock listings: ${report.activity.stockListings}`,
            `Orders this month: ${report.activity.ordersThisMonth}`,
            `Payments this month: ${report.activity.paymentsThisMonth}`
          ])
    ];

    const pdf = buildSimplePdf(type === 'monthly-sales' ? 'Monthly Sales Report' : 'Activity Report', lines);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-${report.period}.pdf"`);
    return res.status(200).send(pdf);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
