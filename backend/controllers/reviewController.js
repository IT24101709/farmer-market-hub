const Review = require('../models/Review');
const Stock = require('../models/Stock');

const uid = (user) => String(user?.id || user?._id || '');

function summaryFrom(reviews) {
  const count = reviews.length;
  const averageRating = count
    ? Number((reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / count).toFixed(2))
    : 0;

  return { count, averageRating };
}

exports.createReview = async (req, res) => {
  try {
    const { stockId, rating, comment, orderId } = req.body;
    const customerId = uid(req.user);

    if (!stockId) {
      return res.status(400).json({ message: 'stockId is required' });
    }

    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const stock = await Stock.findById(stockId);
    if (!stock || stock.isDeleted) {
      return res.status(404).json({ message: 'Vegetable listing not found' });
    }

    const review = await Review.findOneAndUpdate(
      { customerId, stockId },
      {
        customerId,
        stockId,
        farmerId: stock.farmerId,
        orderId: orderId || null,
        rating: numericRating,
        comment: comment || '',
        isRemoved: false,
        removedBy: null,
        removalReason: '',
        removedAt: null
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .populate('customerId', 'name')
      .populate('stockId', 'name imageUrl')
      .populate('farmerId', 'name');

    res.status(201).json({ success: true, data: review, message: 'Review saved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const { stockId, farmerId, includeRemoved } = req.query;
    const filter = {};

    if (stockId) filter.stockId = stockId;
    if (farmerId) filter.farmerId = farmerId;
    if (includeRemoved !== 'true' || req.user.role !== 'Admin') {
      filter.isRemoved = false;
    }

    const reviews = await Review.find(filter)
      .populate('customerId', 'name')
      .populate('stockId', 'name imageUrl')
      .populate('farmerId', 'name')
      .sort({ createdAt: -1 })
      .limit(200);

    const visible = reviews.filter((review) => !review.isRemoved);
    res.status(200).json({
      success: true,
      data: reviews,
      summary: summaryFrom(visible)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getReviewSummary = async (req, res) => {
  try {
    const { stockId, farmerId } = req.query;
    const filter = { isRemoved: false };

    if (stockId) filter.stockId = stockId;
    if (farmerId) filter.farmerId = farmerId;

    const result = await Review.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);

    const summary = result[0]
      ? { count: result[0].count, averageRating: Number(result[0].averageRating.toFixed(2)) }
      : { count: 0, averageRating: 0 };

    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOwnReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (String(review.customerId) !== uid(req.user)) {
      return res.status(403).json({ message: 'You can only edit your own review' });
    }

    const numericRating = Number(req.body.rating);
    if (Number.isFinite(numericRating)) {
      if (numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
      review.rating = numericRating;
    }

    if (typeof req.body.comment === 'string') {
      review.comment = req.body.comment;
    }
    review.isRemoved = false;
    review.removalReason = '';
    review.removedAt = null;
    review.removedBy = null;
    await review.save();

    res.status(200).json({ success: true, data: review, message: 'Review updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteOwnReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (String(review.customerId) !== uid(req.user)) {
      return res.status(403).json({ message: 'You can only delete your own review' });
    }

    await Review.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.adminRemoveReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.isRemoved = true;
    review.removedBy = req.user._id || req.user.id;
    review.removalReason = req.body.reason || 'Removed by admin';
    review.removedAt = new Date();
    await review.save();

    res.status(200).json({ success: true, data: review, message: 'Review removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
