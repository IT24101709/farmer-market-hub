const Notification = require('../models/Notification');

const uid = (user) => String(user?.id || user?._id || '');

exports.getMyNotifications = async (req, res) => {
  try {
    const list = await Notification.find({ userId: uid(req.user) })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, data: list, unread: list.filter((n) => !n.read).length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: uid(req.user) },
      { read: true },
      { new: true }
    );
    if (!n) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, data: n });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: uid(req.user), read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
