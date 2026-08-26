export const CATEGORY_AR = {
  "Cereals And Cereal-Based Food": "الحبوب ومنتجاتها",
  "Bakery And Bakery-Based Products": "المخبوزات ومنتجاتها",
  "TUBERS AND TUBER-BASED FOOD": "الدرنيات ومنتجاتها",
  "LEGOMES AND LEGUME-BASED FOOD": "البقوليات ومنتجاتها",
  "NUTS,SEEDS AND PRODUCTS": "المكسرات والبذور ومنتجاتها",
  "VEGETABLES": "الخضروات",
  "FEUITS": "الفواكه",
  "Sweets and Confectionary": "الحلويات والسكريات",
  "Meat": "اللحوم",
  "Eggs": "البيض",
  "Fish and Fish-Based Food": "الأسماك ومنتجاتها",
  "Milk and Dairy Products.": "الحليب ومنتجات الألبان",
  "Drinks": "المشروبات",
  "Condiments": "التوابل والمنكهات",
  "Miscellaneous": "أصناف متنوعة",
};

const NUMERIC_FIELDS = [
  "water","energy","protein","fats","fiber","carbohydrates","sodium","potassium",
  "calcium","phosphorus","magnesium","iron","zinc","copper","vitaminA","vitaminC",
  "vitaminB1","vitaminB2"
];

export function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  const src = String(text).replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function parseFoodCsv(text) {
  const rows = parseCsv(text);
  const header = rows.shift();
  if (!header || header.length < 20) throw new Error("Invalid nutrition CSV header");
  const index = Object.fromEntries(header.map((name, i) => [name, i]));
  const foods = [];
  const categoriesMap = new Map();

  for (const row of rows) {
    if (!row.length || !row[index.name]) continue;
    const sourceRow = Number(row[index.sourceRow]);
    const category = row[index.category];
    const food = {
      id: `r${String(sourceRow).padStart(3, "0")}`,
      sourceNumber: Number(row[index.sourceNumber]),
      sourceRow,
      categoryId: row[index.categoryId],
      category,
      categoryAr: CATEGORY_AR[category] || category,
      name: row[index.name],
    };
    for (const key of NUMERIC_FIELDS) {
      const raw = row[index[key]];
      if (String(raw).trim().toUpperCase() === "T") {
        food[key] = 0;
        food.traceNutrients ||= [];
        food.rawQualitativeValues ||= {};
        food.traceNutrients.push(key);
        food.rawQualitativeValues[key] = "T";
      } else {
        const num = Number(raw);
        if (!Number.isFinite(num)) throw new Error(`Invalid numeric value at source row ${sourceRow}: ${key}`);
        food[key] = num;
      }
    }
    foods.push(food);
    if (!categoriesMap.has(food.categoryId)) {
      categoriesMap.set(food.categoryId, { id: food.categoryId, name: category, nameAr: food.categoryAr });
    }
  }

  return {
    meta: {
      title: "Food Composition tables For Egypt",
      sheet: "Sheet1",
      foodCount: foods.length,
      categoryCount: categoriesMap.size,
      basisGrams: 100,
      qualitativeHandling: "T means Trace; it is preserved and excluded from numeric totals because no magnitude is provided."
    },
    categories: [...categoriesMap.values()],
    foods,
  };
}

export function assembleFoodDatabase(manifest, csvTexts) {
  if (!manifest || !Array.isArray(manifest.chunks) || !Array.isArray(manifest.categories)) {
    throw new Error("Invalid food manifest");
  }
  const foods = [];
  for (const text of csvTexts) foods.push(...parseFoodCsv(text).foods);
  if (foods.length !== Number(manifest.foodCount)) {
    throw new Error(`Food dataset count mismatch: expected ${manifest.foodCount}, got ${foods.length}`);
  }
  return {
    meta: {
      title: manifest.title,
      sheet: manifest.sheet,
      foodCount: foods.length,
      categoryCount: manifest.categories.length,
      basisGrams: manifest.basisGrams || 100,
    },
    categories: manifest.categories.map((c) => ({ id: c.id, name: c.name, nameAr: c.nameAr })),
    foods,
  };
}
