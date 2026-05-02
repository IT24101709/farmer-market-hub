const { LEGACY_CATEGORY_MAP } = require('./stockCategory');

const DEFAULT_SHELF_DAYS = {
  'leafy-greens': 4,
  fruiting: 6,
  gourds: 8,
  'root-vegetables': 14,
  'beans-pods': 5,
  'bulbs-stems': 21,
  'herbs-spices': 7,
  other: 7
};

function normalizeCategorySlug(slug) {
  const s = String(slug || 'other').toLowerCase();
  return LEGACY_CATEGORY_MAP[s] || s;
}

const NAME_OVERRIDE_RULES = [
  { re: /lettuce|spinach|arugula|rocket|mizuna/, days: 3 },
  { re: /basil|mint|cilantro|coriander|parsley|dill/, days: 4 },
  { re: /tomato|cherry\s*tomato/, days: 7 },
  { re: /broccoli|cauliflower/, days: 5 },
  { re: /mushroom/, days: 4 },
  { re: /bean\s*sprout|sprouts/, days: 2 }
];

/**
 * Shelf life in days from harvest for expiry calculation.
 */
function getShelfLifeDays(categorySlug, vegetableName) {
  const slug = normalizeCategorySlug(categorySlug);
  const name = String(vegetableName || '').toLowerCase();

  for (const rule of NAME_OVERRIDE_RULES) {
    if (name && rule.re.test(name)) return rule.days;
  }

  return DEFAULT_SHELF_DAYS[slug] ?? DEFAULT_SHELF_DAYS.other;
}

/**
 * Expiry date at end of harvest day + shelf days (calendar).
 */
function expiryFromHarvest(harvestDate, categorySlug, vegetableName) {
  const harvest = harvestDate instanceof Date ? new Date(harvestDate) : new Date(harvestDate);
  const days = getShelfLifeDays(categorySlug, vegetableName);
  const out = new Date(harvest);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() + days);
  return out;
}

function daysBetween(from, to) {
  const a = new Date(from);
  a.setHours(0, 0, 0, 0);
  const b = new Date(to);
  b.setHours(0, 0, 0, 0);
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * @param {object} stock — plain object or document with quantity, pricePerKg, expiryDate, status, name?, category?
 * @param {Date} [now]
 * @returns {{ daysLeft: number, spoilageRiskLevel: string, atRiskValue: number }}
 */
function computeSpoilageMeta(stock, now = new Date()) {
  const quantity = Math.max(Number(stock.quantity) || 0, 0);
  const pricePerKg = Math.max(Number(stock.pricePerKg) || 0, 0);
  const atRiskValue = quantity * pricePerKg;

  const expiryDate = stock.expiryDate ? new Date(stock.expiryDate) : null;
  const status = stock.status || '';

  let daysLeft = 0;
  if (expiryDate && !Number.isNaN(expiryDate.getTime())) {
    daysLeft = daysBetween(now, expiryDate);
  }

  let spoilageRiskLevel = 'low';
  if (status === 'Expired' || daysLeft < 0 || daysLeft <= 2) {
    spoilageRiskLevel = 'critical';
  } else if (daysLeft <= 4) {
    spoilageRiskLevel = 'high';
  } else if (daysLeft <= 7 || (quantity > 0 && quantity < 10)) {
    spoilageRiskLevel = 'medium';
  }

  return {
    daysLeft,
    spoilageRiskLevel,
    atRiskValue
  };
}

function attachSpoilageMeta(stock, now = new Date()) {
  const meta = computeSpoilageMeta(stock, now);
  return {
    ...stock,
    daysLeft: meta.daysLeft,
    spoilageRiskLevel: meta.spoilageRiskLevel,
    estimatedWastageValue: meta.atRiskValue
  };
}

module.exports = {
  getShelfLifeDays,
  expiryFromHarvest,
  computeSpoilageMeta,
  attachSpoilageMeta
};
