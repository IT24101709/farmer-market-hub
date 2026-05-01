const Stock = require('../models/Stock');
const Category = require('../models/Category');
const User = require('../models/User');

// Validation middleware for stock create/update (relaxed for demo)
const validateStockData = async (req, res, next) => {
  try {
    const { vegetableName, quantity, pricePerKg, harvestDate, categoryId } = req.body;

    // Required fields
    if (!vegetableName || !harvestDate) {
      return res.status(400).json({ 
        message: '❌ Vegetable name and harvest date are required.' 
      });
    }

    // Parse dates/numbers
    let parsedHarvestDate = new Date(harvestDate);
    const now = new Date();

    // Relaxed: auto-fix future date
    if (isNaN(parsedHarvestDate) || parsedHarvestDate > now) {
      parsedHarvestDate = now;
    }

    // Quantity validation (relaxed)
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ 
        message: '❌ Quantity must be a positive number.' 
      });
    }

    // Price validation
    const price = Number(pricePerKg);
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ 
        message: '❌ Price must be a positive number.' 
      });
    }

    // Attach parsed data
    req.validatedData = {
      ...req.body,
      quantity: qty,
      harvestDate: parsedHarvestDate,
      pricePerKg: price
    };

    next();
  } catch (error) {
    res.status(500).json({ message: 'Validation error', error: error.message });
  }
};

module.exports = { validateStockData };
