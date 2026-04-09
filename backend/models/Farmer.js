const mongoose = require('mongoose');

const FarmerSchema = new mongoose.Schema({
    farmerName: { type: String, required: true },
    location: { type: String, required: true },
    contactNo: { type: String, required: true },
    stockType: String, // e.g., "Vegetables", "Fruits"
    joinedDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Farmer', FarmerSchema);