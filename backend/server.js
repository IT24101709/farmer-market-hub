const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Load env vars
dotenv.config();

const app = express();

// Body parser
app.use(express.json());
app.use(cors());

// Serve static fields for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const stockRoutes = require('./routes/stockRoutes');
const marketRoutes = require('./routes/marketRoutes');
const farmerRoutes = require('./routes/farmerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);

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
    .then(() => {
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(() => {
      console.error('Startup aborted due to MongoDB connection failure.');
    });
}

module.exports = app;
