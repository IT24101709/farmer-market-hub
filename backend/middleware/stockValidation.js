const Category = require('../models/Category');
const {
  CATEGORY_ENUM,
  inferCategorySlugFromLabel,
  isValidCategorySlug
} = require('../utils/stockCategory');
const UNIT_ENUM = ['kg', 'g', 'pcs'];
const STATUS_ENUM = ['Available', 'Low Stock', 'Out of Stock', 'Expired', 'Frozen'];

const isValidDate = (date) => date instanceof Date && !Number.isNaN(date.getTime());

const validateStockData = async (req, res, next) => {
  try {
    const isCreate = req.method === 'POST';

    if (isCreate) {
      if (!req.body.name && req.body.vegetableName) {
        req.body.name = String(req.body.vegetableName).trim();
      }
      if (!req.body.unit) {
        req.body.unit = 'kg';
      }
    }

    if (req.body.categoryId) {
      const categoryDoc = await Category.findById(req.body.categoryId);

      if (!categoryDoc) {
        return res.status(400).json({ message: 'Please select a valid category.' });
      }

      req.stockLimits = {
        minPriceLimit: categoryDoc.minPrice,
        maxPriceLimit: categoryDoc.maxPrice
      };

      if (isCreate && !req.body.category) {
        const fromSlug =
          categoryDoc.slug && isValidCategorySlug(categoryDoc.slug) ? categoryDoc.slug : null;
        req.body.category = fromSlug || inferCategorySlugFromLabel(categoryDoc.name);
      }
    }

    const {
      name,
      category,
      unit,
      quantity,
      pricePerKg,
      harvestDate,
      expiryDate,
      categoryId,
      qualityGrade,
      status,
      description
    } = req.body;

    if (isCreate && (!name || !category || !quantity || !pricePerKg || !harvestDate || !unit || !status)) {
      return res.status(400).json({
        message: 'Name, category, unit, quantity, price, harvest date, and status are required.'
      });
    }

    if (isCreate && !req.file) {
      return res.status(400).json({ message: 'Stock image is required.' });
    }

    const validatedData = { ...req.body };

    if (name !== undefined) {
      const cleanName = String(name).trim();

      if (cleanName.length < 2 || cleanName.length > 60) {
        return res.status(400).json({ message: 'Name must be between 2 and 60 characters.' });
      }

      if (!/^[a-zA-Z\s-]+$/.test(cleanName)) {
        return res.status(400).json({ message: 'Name can only contain letters, spaces, and hyphens.' });
      }

      validatedData.name = cleanName;
    }

    if (category !== undefined) {
      const cleanCategory = String(category).toLowerCase().trim();

      if (!CATEGORY_ENUM.includes(cleanCategory)) {
        return res.status(400).json({
          message: `Category must be one of: ${CATEGORY_ENUM.join(', ')}`
        });
      }

      validatedData.category = cleanCategory;
    }

    if (unit !== undefined) {
      const cleanUnit = String(unit).toLowerCase().trim();

      if (!UNIT_ENUM.includes(cleanUnit)) {
        return res.status(400).json({
          message: `Unit must be one of: ${UNIT_ENUM.join(', ')}`
        });
      }

      validatedData.unit = cleanUnit;
    }

    if (quantity !== undefined) {
      const qty = Number(quantity);

      if (!Number.isFinite(qty) || qty < 0 || qty > 100000) {
        return res.status(400).json({ message: 'Quantity must be 0 or a positive number up to 100000.' });
      }

      validatedData.quantity = qty;
    }

    if (pricePerKg !== undefined) {
      const price = Number(pricePerKg);

      if (!Number.isFinite(price) || price < 0.01) {
        return res.status(400).json({ message: 'Price must be at least 0.01.' });
      }

      const min = req.stockLimits?.minPriceLimit ?? 1;
      const max = req.stockLimits?.maxPriceLimit ?? 100000;

      if (price < min || price > max) {
        return res.status(400).json({
          message: `Price must be between LKR ${min} and LKR ${max} per kg for the selected category.`
        });
      }

      validatedData.pricePerKg = price;
    }

    if (harvestDate !== undefined) {
      const parsedHarvestDate = new Date(harvestDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!isValidDate(parsedHarvestDate)) {
        return res.status(400).json({ message: 'Please enter a valid harvest date.' });
      }

      if (parsedHarvestDate > today) {
        return res.status(400).json({ message: 'Harvest date cannot be in the future.' });
      }

      validatedData.harvestDate = parsedHarvestDate;
    }

    if (expiryDate !== undefined) {
      const parsedExpiryDate = new Date(expiryDate);
      const parsedHarvestDate = validatedData.harvestDate || (harvestDate ? new Date(harvestDate) : null);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!isValidDate(parsedExpiryDate)) {
        return res.status(400).json({ message: 'Please enter a valid expiry date.' });
      }

      if (parsedExpiryDate <= today) {
        return res.status(400).json({ message: 'Expiry date must be after today.' });
      }

      if (parsedHarvestDate && isValidDate(parsedHarvestDate) && parsedExpiryDate <= parsedHarvestDate) {
        return res.status(400).json({ message: 'Expiry date must be after harvest date.' });
      }

      validatedData.expiryDate = parsedExpiryDate;
    }

    if (qualityGrade !== undefined && !['A', 'B', 'C'].includes(qualityGrade)) {
      return res.status(400).json({ message: 'Quality grade must be A, B, or C.' });
    }

    if (status !== undefined && !STATUS_ENUM.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${STATUS_ENUM.join(', ')}`
      });
    }

    if (description !== undefined) {
      const cleanDesc = String(description).trim();
      if (cleanDesc.length > 500) {
        return res.status(400).json({ message: 'Description cannot exceed 500 characters.' });
      }
      validatedData.description = cleanDesc;
    }

    req.validatedData = validatedData;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Validation error', error: error.message });
  }
};

module.exports = { validateStockData };
