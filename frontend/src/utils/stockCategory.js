/**
 * Stock.category enum — keep aligned with backend/utils/stockCategory.js
 */
export const CATEGORY_ENUM = [
  'leafy-greens',
  'root-vegetables',
  'fruiting',
  'gourds',
  'beans-pods',
  'bulbs-stems',
  'herbs-spices',
  'other'
];

export function inferCategorySlugFromLabel(label) {
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

/** Prefer API category.slug when present (canonical dropdown rows). */
export function resolveStockCategorySlug(categoryDoc) {
  if (!categoryDoc) return 'other';
  const s = categoryDoc.slug;
  if (s && CATEGORY_ENUM.includes(String(s).toLowerCase())) {
    return String(s).toLowerCase();
  }
  return inferCategorySlugFromLabel(categoryDoc.name);
}
