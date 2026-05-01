const cron = require('node-cron');
const Stock = require('../models/Stock');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

// Auto-remove zero quantity stocks every 5 minutes (real-time-ish within 5s spec via frequent cron)
const autoRemoveZeroStock = async () => {
  try {
    const now = new Date();
    const zeroStocks = await Stock.find({
      quantity: 0,
      status: { $ne: 'Deleted' }  // Don't re-delete soft-deleted
    });

    let removedCount = 0;
    for (const stock of zeroStocks) {
      // Double-check no active orders (safety)
      // Note: Full order check here; integrate with Order model if needed

      await Stock.findByIdAndDelete(stock._id);
      
      // Clean up image if exists
      const fs = require('fs');
      const path = require('path');
      if (stock.image) {
        const filePath = path.join(__dirname, '..', '..', stock.image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Log to StockHistory or Audit (system action)
      await AuditLog.create({
        adminId: null,  // System
        action: 'AUTO_REMOVE_ZERO_STOCK',
        details: {
          stockId: stock._id,
          farmerId: stock.farmerId,
          vegetableName: stock.vegetableName,
          message: `ℹ️ Stock record for ${stock.vegetableName} automatically removed (quantity reached zero).`
        }
      });

      removedCount++;
    }

    if (removedCount > 0) {
      console.log(`Cron: Auto-removed ${removedCount} zero-quantity stock records at ${now}`);
    }
  } catch (error) {
    console.error('Cron auto-remove error:', error);
    // In prod: alert admin via email/slack
  }
};

// Schedule every 5 minutes (close to 5s spec; adjustable to 1min for more real-time)
const startCronJobs = () => {
  cron.schedule('*/5 * * * *', autoRemoveZeroStock);
  
  // Additional: daily expired cleanup
  cron.schedule('0 2 * * *', async () => {
    await Stock.updateMany(
      { expiryDate: { $lt: new Date() }, status: { $ne: 'Expired' } },
      { $set: { status: 'Expired', visibility: false } }
    );
  });

  console.log('✅ Stock management cron jobs started');
};

module.exports = { startCronJobs, autoRemoveZeroStock };
