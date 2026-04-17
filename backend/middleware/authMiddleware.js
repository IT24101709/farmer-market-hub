const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
      
      // Usually you would fetch the user from DB, but for this component 
      // we just need the userId to associate with the stock
      req.user = { id: decoded.id || decoded.userId || decoded._id }; 
      
      next();
    } catch (error) {
      console.error(error);
      // For development/integration testing without auth module ready:
      // Fallback dummy user if verification fails
      if (process.env.NODE_ENV === 'development_no_auth') {
        req.user = { id: '60d0fe4f5311236168a109ca' }; // dummy valid ObjectId
        return next();
      }
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    if (process.env.NODE_ENV === 'development_no_auth') {
      req.user = { id: '60d0fe4f5311236168a109ca' }; // dummy valid ObjectId
      return next();
    }
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
