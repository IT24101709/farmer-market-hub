const Review = require('../models/Review');
const Stock = require('../models/Stock');
const Order = require('../models/Order');
const User = require('../models/User');
const mongoose = require('mongoose');

const uid = (user) => String(user?.id || user?._id || '');

const COMMENT_MIN_LENGTH = 3;
const COMMENT_MAX_LENGTH = 600;
const DUPLICATE_WINDOW_MS = 60 * 1000;
const PROFANITY_PATTERNS = [
  /\bfuck(?:ing|er|ed)?\b/i,
  /\bshit(?:ty)?\b/i,
  /\basshole\b/i,
  /\bbitch\b/i,
  /\bbastard\b/i,
  /\bdamn\b/i,
  /\bscam(?:mer)?\b/i
];

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ''));
}

function normalizeComment(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function validateComment(comment) {
  if (comment.length < COMMENT_MIN_LENGTH) {
    return `Review text must be at least ${COMMENT_MIN_LENGTH} characters.`;
  }
  if (comment.length > COMMENT_MAX_LENGTH) {
    return `Review text cannot exceed ${COMMENT_MAX_LENGTH} characters.`;
  }
  if (PROFANITY_PATTERNS.some((pattern) => pattern.test(comment))) {
    return 'Review contains inappropriate language.';
  }
  if (/(.)\1{7,}/i.test(comment)) {
    return 'Review looks like spam. Avoid repeated characters.';
  }
  const words = comment.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 6) {
    const mostCommon = Math.max(...words.map((word) => words.filter((w) => w === word).length));
    if (mostCommon / words.length > 0.55) {
      return 'Review looks like spam. Avoid repeating the same words.';
    }
  }
  if (/(https?:\/\/|www\.|@\w+)/i.test(comment)) {
    return 'Review text cannot include links or promotional contact handles.';
  }
  return null;
}

function validateRating(value) {
  const numericRating = Number(value);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return { error: 'Rating must be a whole number between 1 and 5.' };
  }
  return { rating: numericRating };
}

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

    if (!customerId || !isObjectId(customerId)) {
      return res.status(401).json({ message: 'You must be logged in to submit a review.' });
    }
    if (req.user?.status && req.user.status !== 'Active') {
      return res.status(403).json({ message: 'Suspended or inactive users cannot submit reviews.' });
    }
    if (!stockId) {
      return res.status(400).json({ message: 'stockId is required' });
    }
    if (!isObjectId(stockId)) {
      return res.status(400).json({ message: 'stockId must be a valid product ID.' });
    }
    if (orderId && !isObjectId(orderId)) {
      return res.status(400).json({ message: 'orderId must be a valid order ID.' });
    }

    const ratingResult = validateRating(rating);
    if (ratingResult.error) {
      return res.status(400).json({ message: ratingResult.error });
    }

    const cleanComment = normalizeComment(comment);
    const commentError = validateComment(cleanComment);
    if (commentError) {
      return res.status(400).json({ message: commentError });
    }

    const [customer, stock] = await Promise.all([
      User.findById(customerId).select('_id role status'),
      Stock.findById(stockId)
    ]);
    if (!customer || customer.role !== 'Customer') {
      return res.status(403).json({ message: 'Only valid customer accounts can submit reviews.' });
    }
    if (!stock || stock.isDeleted) {
      return res.status(404).json({ message: 'Vegetable listing not found' });
    }

    if (String(stock.farmerId) === customerId) {
      return res.status(400).json({ message: 'You cannot review your own product listing.' });
    }

    if (orderId) {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found for this review.' });
      }
      if (String(order.customerId) !== customerId) {
        return res.status(403).json({ message: 'You can only review products from your own orders.' });
      }
      const orderedThisProduct = (order.items || []).some((item) => String(item.stockId) === String(stockId));
      if (!orderedThisProduct) {
        return res.status(400).json({ message: 'This product was not part of the selected order.' });
      }
      if (!['DELIVERED', 'CONFIRMED', 'READY_FOR_DELIVERY', 'ASSIGNED', 'IN_TRANSIT'].includes(order.status)) {
        return res.status(400).json({ message: 'You can review only after the order is confirmed or fulfilled.' });
      }
    }

    const existingReview = await Review.findOne({ customerId, stockId });
    if (existingReview) {
      const recentlyUpdated =
        existingReview.updatedAt &&
        Date.now() - new Date(existingReview.updatedAt).getTime() < DUPLICATE_WINDOW_MS;
      if (recentlyUpdated) {
        return res.status(429).json({ message: 'Please wait before editing this review again.' });
      }
    }

    const review = await Review.findOneAndUpdate(
      { customerId, stockId },
      {
        customerId,
        stockId,
        farmerId: stock.farmerId,
        orderId: orderId || null,
        rating: ratingResult.rating,
        comment: cleanComment,
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

    const reviews = await Review.find(filter).select('rating');
    res.status(200).json({ success: true, data: summaryFrom(reviews) });
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

    if (review.updatedAt && Date.now() - new Date(review.updatedAt).getTime() < DUPLICATE_WINDOW_MS) {
      return res.status(429).json({ message: 'Please wait before editing this review again.' });
    }

    if (req.body.rating !== undefined) {
      const ratingResult = validateRating(req.body.rating);
      if (ratingResult.error) {
        return res.status(400).json({ message: ratingResult.error });
      }
      review.rating = ratingResult.rating;
    }

    if (typeof req.body.comment === 'string') {
      const cleanComment = normalizeComment(req.body.comment);
      const commentError = validateComment(cleanComment);
      if (commentError) {
        return res.status(400).json({ message: commentError });
      }
      review.comment = cleanComment;
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
