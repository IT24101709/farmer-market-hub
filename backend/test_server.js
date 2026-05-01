const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

dotenv.config();

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cors());
app.use(mongoSanitize());
app.use(xss());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests',
});

app.use('/api', apiLimiter);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

async function start() {
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  console.log('MongoDB In-Memory:', mongoUri);

  await mongoose.connect(mongoUri);
  console.log('MongoDB connected');

// Seed all users
  const User = require('./models/User');
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);
  
  await User.create({
    name: 'Admin',
    email: 'admin@farmersmarket.com',
    password: hashedPassword,
    role: 'Admin',
    isApproved: true
  });
  console.log('✅ Admin seeded');
  
  // Farmer
  const farmerSalt = await bcrypt.genSalt(10);
  await User.create({
    name: 'Test Farmer',
    email: 'farmer@test.com',
    password: await bcrypt.hash('Farmer123@', farmerSalt),
    role: 'Farmer',
    isApproved: true,
    profileDetails: { phone: '0712345678', businessName: 'Test Farm' }
  });
  console.log('✅ Farmer seeded');
  
  // Customer
  const custSalt = await bcrypt.genSalt(10);
  await User.create({
    name: 'Test Customer',
    email: 'customer@test.com',
    password: await bcrypt.hash('Customer123@', custSalt),
    role: 'Customer',
    isApproved: true
  });
  console.log('✅ Customer seeded');
  
  console.log('========================================');
  console.log('🎉 USERS READY:');
  console.log('Admin: admin@farmersmarket.com / admin123');
  console.log('Farmer: farmer@test.com / Farmer123@');
  console.log('Customer: customer@test.com / Customer123@');
  console.log('========================================');

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server on ${PORT}`));
}

start().catch(console.error);
