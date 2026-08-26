export const NUTRIENTS = [
  { key: "energy", label: "الطاقة", short: "طاقة", unit: "kcal", primary: true },
  { key: "protein", label: "البروتين", short: "بروتين", unit: "g", primary: true },
  { key: "fats", label: "الدهون", short: "دهون", unit: "g", primary: true },
  { key: "carbohydrates", label: "الكربوهيدرات", short: "كربوهيدرات", unit: "g", primary: true },
  { key: "fiber", label: "الألياف", short: "ألياف", unit: "g", primary: true },
  { key: "water", label: "الماء", short: "ماء", unit: "g" },
  { key: "sodium", label: "الصوديوم", short: "Na", unit: "mg" },
  { key: "potassium", label: "البوتاسيوم", short: "K", unit: "mg" },
  { key: "calcium", label: "الكالسيوم", short: "Ca", unit: "mg" },
  { key: "phosphorus", label: "الفوسفور", short: "Ph", unit: "mg" },
  { key: "magnesium", label: "الماغنسيوم", short: "Mg", unit: "mg" },
  { key: "iron", label: "الحديد", short: "Fe", unit: "mg" },
  { key: "zinc", label: "الزنك", short: "Zn", unit: "mg" },
  { key: "copper", label: "النحاس", short: "Cu", unit: "mg" },
  { key: "vitaminA", label: "فيتامين أ", short: "Vit A", unit: "µg RE" },
  { key: "vitaminC", label: "فيتامين ج", short: "Vit C", unit: "mg" },
  { key: "vitaminB1", label: "فيتامين ب1", short: "B1", unit: "mg" },
  { key: "vitaminB2", label: "فيتامين ب2", short: "B2", unit: "mg" },
];

export const TARGET_NUTRIENTS = NUTRIENTS.filter((n) => n.key !== "water");

export function normalizeGrams(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 100000);
}

export function scaleValue(sourceValue, grams) {
  const source = Number(sourceValue);
  const qty = normalizeGrams(grams);
  if (!Number.isFinite(source)) return 0;
  return (source * qty) / 100;
}

export function calculateFood(food, grams) {
  const qty = normalizeGrams(grams);
  const values = {};
  for (const nutrient of NUTRIENTS) {
    values[nutrient.key] = scaleValue(food[nutrient.key], qty);
  }
  return { foodId: food.id, grams: qty, values };
}

export function calculateTotals(items, foodLookup) {
  const totals = Object.fromEntries(NUTRIENTS.map((n) => [n.key, 0]));
  for (const item of items) {
    const food = foodLookup.get(item.foodId);
    if (!food) continue;
    const row = calculateFood(food, item.grams);
    for (const nutrient of NUTRIENTS) {
      totals[nutrient.key] += row.values[nutrient.key];
    }
  }
  return totals;
}

export function formatNumber(value, maxDecimals = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("ar-EG", {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0,
  }).format(n);
}

export function csvNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.round((n + Number.EPSILON) * 10000) / 10000) : "0";
}
