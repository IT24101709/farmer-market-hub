const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Load env vars
dotenv.config();

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');

const app = express();

// Security Headers
app.use(helmet());

// Body parser
app.use(express.json());
app.use(cors());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Rate Limiting Config
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all /api routes
app.use('/api', apiLimiter);

// Serve static fields for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const stockRoutes = require('./routes/stockRoutes');
const marketRoutes = require('./routes/marketRoutes');
const farmerRoutes = require('./routes/farmerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const orderRoutes = require('./routes/orderRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);

// Main Server Startup logic (if this file is run directly)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  const connectDB = async () => {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('Missing required environment variable: MONGO_URI');
      process.exit(1);
    }

    try {
      await mongoose.connect(uri, {
        family: 4,
        tls: true,
        serverSelectionTimeoutMS: 30000,
      });
      console.log('MongoDB connected');
    } catch (err) {
      console.error('MongoDB connection error:');
      console.error(err);
      if (err.code === 'ECONNREFUSED' && err.message.includes('querySrv')) {
        console.error('SRV DNS lookup failed. Your machine may not be able to resolve Atlas SRV records.');
        console.error('Use the standard mongodb:// replica set URI from Atlas instead of mongodb+srv://.');
      }
      process.exit(1);
    }
  };

connectDB()
    .then(async () => {
      // Seed users on first connection
      const User = require('./models/User');
      const bcrypt = require('bcryptjs');
      
      const adminExists = await User.findOne({ role: 'Admin' });
      if (!adminExists) {
        const salt = await bcrypt.genSalt(10);
        await User.create({
          name: 'Admin',
          email: 'admin@farmersmarket.com',
          password: await bcrypt.hash('admin123', salt),
          role: 'Admin',
          isApproved: true
        });
        console.log('✅ Admin seeded');
      }
      
      const farmerExists = await User.findOne({ email: 'farmer@test.com' });
      if (!farmerExists) {
        const salt = await bcrypt.genSalt(10);
        await User.create({
          name: 'Test Farmer',
          email: 'farmer@test.com',
          password: await bcrypt.hash('Farmer123@', salt),
          role: 'Farmer',
          isApproved: true,
          profileDetails: { phone: '0712345678', businessName: 'Test Farm' }
        });
        console.log('✅ Farmer seeded');
      }
      
      const customerExists = await User.findOne({ email: 'customer@test.com' });
      if (!customerExists) {
        const salt = await bcrypt.genSalt(10);
        await User.create({
          name: 'Test Customer',
          email: 'customer@test.com',
          password: await bcrypt.hash('Customer123@', salt),
          role: 'Customer',
          isApproved: true
        });
        console.log('✅ Customer seeded');
      }
      
      console.log('========================================');
      console.log('🎉 USERS READY:');
      console.log('Admin: admin@farmersmarket.com / admin123');
      console.log('Farmer: farmer@test.com / Farmer123@');
      console.log('Customer: customer@test.com / Customer123@');
      console.log('========================================');
      
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(() => {
      console.error('Startup aborted due to MongoDB connection failure.');
    });
}

module.exports = app;
