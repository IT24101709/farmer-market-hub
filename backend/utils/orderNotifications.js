const Notification = require('../models/Notification');

async function notifyUser(userId, { title, body, orderId, type = 'system' }) {
  if (!userId) return null;
  try {
    return await Notification.create({
      userId,
      title,
      body: body || '',
      orderId: orderId || undefined,
      type,
      read: false
    });
  } catch (e) {
    console.error('notifyUser failed:', e.message);
    return null;
  }
}

async function notifyFarmersForOrder(order, { title, body, type }) {
  const ids = [...new Set((order.items || []).map((i) => String(i.farmerId)).filter(Boolean))];
  for (const fid of ids) {
    await notifyUser(fid, { title, body, orderId: order._id, type });
  }
}

module.exports = { notifyUser, notifyFarmersForOrder };
