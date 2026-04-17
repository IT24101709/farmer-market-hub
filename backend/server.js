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
const stockRoutes = require('./routes/stockRoutes');
app.use('/api/stocks', stockRoutes);

// Main Server Startup logic (if this file is run directly)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  
  // Connect to DB temporarily here if testing standalone
  if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).then(() => {
      console.log('MongoDB connected');
    }).catch(err => {
      console.error('MongoDB connection error:', err);
    });
  } else {
    console.warn('Set MONGO_URI in .env to connect to DB for testing');
  }

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
