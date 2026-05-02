const Category = require('../models/Category');
const {
  CATEGORY_ENUM,
  isValidCategorySlug,
  inferCategorySlugFromLabel
} = require('../utils/stockCategory');

// @desc    Get all categories (canonical marketplace types + seeded rows)
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ slug: { $in: CATEGORY_ENUM } }).sort({ slug: 1 });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private (Admin only)
exports.createCategory = async (req, res) => {
  try {
    const { name, description, slug: slugRaw } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    let slug = slugRaw ? String(slugRaw).toLowerCase().trim() : '';
    if (!slug) {
      slug = inferCategorySlugFromLabel(name);
    }
    if (!isValidCategorySlug(slug)) {
      return res.status(400).json({
        message: `Category must map to a valid type. Use slug from: ${CATEGORY_ENUM.join(', ')}`
      });
    }

    const categoryExists = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (categoryExists) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const slugTaken = await Category.findOne({ slug });
    if (slugTaken) {
      return res.status(400).json({ message: 'This category slug is already in use' });
    }

    const category = await Category.create({ name, description, slug });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private (Admin only)
exports.updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (name && name !== category.name) {
      const categoryExists = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      if (categoryExists) {
        return res.status(400).json({ message: 'Category name already exists' });
      }
      category.name = name;
    }
    
    if (description !== undefined) {
      category.description = description;
    }

    const updatedCategory = await category.save();
    res.status(200).json(updatedCategory);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private (Admin only)
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Category removed successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
