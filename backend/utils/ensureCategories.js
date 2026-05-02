const Category = require('../models/Category');
const Stock = require('../models/Stock');
const { CATEGORY_SEEDS, LEGACY_CATEGORY_MAP, CATEGORY_ENUM } = require('./stockCategory');

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function migrateLegacyStockCategories() {
  for (const [from, to] of Object.entries(LEGACY_CATEGORY_MAP)) {
    const r = await Stock.updateMany({ category: from }, { $set: { category: to } });
    if (r.modifiedCount > 0) {
      console.log(`📂 Migrated stock.category ${from} → ${to} (${r.modifiedCount} docs)`);
    }
  }
}

/**
 * Upsert the canonical category list so dropdown + validation stay aligned.
 * Merges into existing rows matched by name so unique `name` is not violated.
 */
async function ensureDefaultCategories() {
  for (const row of CATEGORY_SEEDS) {
    const bySlug = await Category.findOne({ slug: row.slug });
    if (bySlug) {
      await Category.updateOne(
        { _id: bySlug._id },
        {
          $set: {
            name: row.name,
            description: row.description,
            minPrice: row.minPrice,
            maxPrice: row.maxPrice,
            slug: row.slug
          }
        }
      );
      continue;
    }

    const byName = await Category.findOne({ name: new RegExp(`^${escapeRegex(row.name)}$`, 'i') });
    if (byName) {
      await Category.updateOne(
        { _id: byName._id },
        {
          $set: {
            slug: row.slug,
            description: row.description,
            minPrice: row.minPrice,
            maxPrice: row.maxPrice
          }
        }
      );
      continue;
    }

    await Category.create({
      slug: row.slug,
      name: row.name,
      description: row.description,
      minPrice: row.minPrice,
      maxPrice: row.maxPrice
    });
  }
  console.log(`✅ Categories ensured (${CATEGORY_ENUM.length} types)`);
}

module.exports = {
  ensureDefaultCategories,
  migrateLegacyStockCategories
};
