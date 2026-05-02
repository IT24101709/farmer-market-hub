const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');

      req.user = await User.findById(decoded.id || decoded.userId || decoded._id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      return next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const adminRole = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
};

const farmerRole = (req, res, next) => {
  if (req.user && req.user.role === 'Farmer') {
    return next();
  }

  return res.status(403).json({ message: 'Access denied. Farmer role required.' });
};

const customerRole = (req, res, next) => {
  if (req.user && req.user.role === 'Customer') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Customer role required.' });
};

module.exports = { protect, adminRole, farmerRole, customerRole };
