require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to Atlas');

  const User = require('./models/User');

  // Clear existing
  await User.deleteMany({});
  console.log('Cleared users');

  const salt = await bcrypt.genSalt(10);

  // Admin
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@farmersmarket.com',
    password: await bcrypt.hash('admin123', salt),
    role: 'Admin',
    isApproved: true
  });
  console.log('Admin created:', admin.email);

  // Farmer
  const farmer = await User.create({
    name: 'Test Farmer',
    email: 'farmer@test.com',
    password: await bcrypt.hash('Farmer123@', salt),
    role: 'Farmer',
    isApproved: true,
    profileDetails: { phone: '0712345678', businessName: 'Green Farm' }
  });
  console.log('Farmer created:', farmer.email);

  // Customer
  const customer = await User.create({
    name: 'Test Customer',
    email: 'customer@test.com',
    password: await bcrypt.hash('Customer123@', salt),
    role: 'Customer',
    isApproved: true,
    profileDetails: { phone: '0712345679' }
  });
  console.log('Customer created:', customer.email);

  console.log('\n✅ ALL USERS SEEDED');
  console.log('Admin: admin@farmersmarket.com / admin123');
  console.log('Farmer: farmer@test.com / Farmer123@');
  console.log('Customer: customer@test.com / Customer123@');

  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
