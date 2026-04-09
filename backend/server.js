const dns = require('node:dns'); 
dns.setServers(['8.8.8.8', '8.8.4.4']); 

require('dotenv').config();
const express = require('express');
const cors = require('cors'); 
const connectDB = require('./config/db');
const Farmer = require('./models/Farmer');

const app = express();

// Use the PORT from .env or default to 5000
const PORT = process.env.PORT || 5000;

// Connect to Database using your config file
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// The POST route
app.post('/api/farmers', async (req, res) => {
    try {
        const newFarmer = new Farmer(req.body);
        const savedFarmer = await newFarmer.save();
        res.status(201).json(savedFarmer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// GET route (to see your farmers)
app.get('/api/farmers', async (req, res) => {
    try {
        const farmers = await Farmer.find();
        res.json(farmers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});