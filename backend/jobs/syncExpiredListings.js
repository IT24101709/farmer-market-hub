const Stock = require('../models/Stock');

/**
 * Mark past-expiry stock as expired and remove from marketplace (visibility / availability off).
 */
async function syncExpiredMarketListings() {
  const now = new Date();
  const result = await Stock.updateMany(
    {
      expiryDate: { $lt: now },
      status: { $ne: 'Expired' }
    },
    {
      $set: {
        status: 'Expired',
        visibility: false,
        availabilityStatus: false
      }
    }
  );
  return result.modifiedCount;
}

module.exports = { syncExpiredMarketListings };
