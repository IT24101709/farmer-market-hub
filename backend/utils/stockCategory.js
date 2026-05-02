/**
 * Stock.category enum — single source of truth (must match Stock model & frontend).
 */
const CATEGORY_ENUM = [
  'leafy-greens',
  'root-vegetables',
  'fruiting',
  'gourds',
  'beans-pods',
  'bulbs-stems',
  'herbs-spices',
  'other'
];

/** Map previous enum values → new slugs (one-time migration). */
const LEGACY_CATEGORY_MAP = {
  leafy: 'leafy-greens',
  root: 'root-vegetables',
  fruit: 'fruiting',
  gourd: 'gourds',
  other: 'other'
};

/**
 * Default rows for Category collection (slug + display name + hints).
 */
const CATEGORY_SEEDS = [
  {
    slug: 'leafy-greens',
    name: 'Leafy greens',
    description: 'Spinach, lettuce, cabbage, kale',
    minPrice: 5,
    maxPrice: 500
  },
  {
    slug: 'root-vegetables',
    name: 'Root vegetables',
    description: 'Carrot, radish, beetroot, turnip',
    minPrice: 5,
    maxPrice: 500
  },
  {
    slug: 'fruiting',
    name: 'Fruiting',
    description: 'Tomato, brinjal, capsicum, chilli',
    minPrice: 5,
    maxPrice: 600
  },
  {
    slug: 'gourds',
    name: 'Gourds',
    description: 'Pumpkin, bitter gourd, snake gourd, ash plantain',
    minPrice: 5,
    maxPrice: 500
  },
  {
    slug: 'beans-pods',
    name: 'Beans & pods',
    description: 'Green beans, long beans, winged beans',
    minPrice: 5,
    maxPrice: 550
  },
  {
    slug: 'bulbs-stems',
    name: 'Bulbs & stems',
    description: 'Onion, garlic, leek, celery',
    minPrice: 5,
    maxPrice: 600
  },
  {
    slug: 'herbs-spices',
    name: 'Herbs & spices',
    description: 'Curry leaves, pandan, lemongrass, coriander',
    minPrice: 5,
    maxPrice: 800
  },
  {
    slug: 'other',
    name: 'Other',
    description: 'Other vegetables',
    minPrice: 5,
    maxPrice: 1000
  }
];

/**
 * Map admin category label (or slug) to Stock.category enum.
 */
function inferCategorySlugFromLabel(label) {
  const slug = String(label || '')
    .toLowerCase()
    .trim();
  if (CATEGORY_ENUM.includes(slug)) return slug;

  const n = slug;
  if (/^leafy[\s-]?greens|leafy|lettuce|spinach|cabbage|kale/.test(n)) return 'leafy-greens';
  if (/root[\s-]?veget|carrot|radish|beet|turnip|yam|potato/.test(n)) return 'root-vegetables';
  if (/fruiting|tomato|brinjal|eggplant|capsicum|chilli|chili|pepper|melons?/.test(n)) return 'fruiting';
  if (/gourd|pumpkin|bitter|snake|squash|plantain|zucchini|luffa/.test(n)) return 'gourds';
  if (/beans?[\s-]?pods|green\s*beans|long\s*beans|winged/.test(n)) return 'beans-pods';
  if (/bulbs?[\s-]?stems|onion|garlic|leek|celery/.test(n)) return 'bulbs-stems';
  if (/herbs?[\s-]?spices|curry\s*leave|pandan|lemongrass|coriander|cilantro|mint|basil/.test(n)) {
    return 'herbs-spices';
  }
  return 'other';
}

function isValidCategorySlug(slug) {
  return CATEGORY_ENUM.includes(String(slug || '').toLowerCase().trim());
}

module.exports = {
  CATEGORY_ENUM,
  LEGACY_CATEGORY_MAP,
  CATEGORY_SEEDS,
  inferCategorySlugFromLabel,
  isValidCategorySlug
};
