import {
  NUTRIENTS,
  TARGET_NUTRIENTS,
  calculateFood,
  calculateTotals,
  formatNumber,
  csvNumber,
  normalizeGrams,
} from "./nutrition.js";
import { assembleFoodDatabase } from "./data.js";

const STORAGE_KEY = "egypt-food-analyzer:v1";
const el = (id) => document.getElementById(id);
const refs = {
  foodSearch: el("foodSearch"), searchResults: el("searchResults"), categorySelect: el("categorySelect"),
  selectedCount: el("selectedCount"), daySelect: el("daySelect"), tableHead: el("tableHead"),
  tableBody: el("tableBody"), tableFoot: el("tableFoot"), emptyState: el("emptyState"),
  desktopTableWrap: el("desktopTableWrap"), mobileCards: el("mobileCards"), referenceGrid: el("referenceGrid"),
  traceNotice: el("traceNotice"), toast: el("toast"), targetsDialog: el("targetsDialog"),
  targetsInputs: el("targetsInputs"), restoreInput: el("restoreInput"),
};

let db = { foods: [], categories: [], meta: {} };
let foodLookup = new Map();
let state = loadState();
let toastTimer;

function defaultState() {
  const dayId = crypto.randomUUID?.() || `d-${Date.now()}`;
  return {
    version: 1,
    activeDayId: dayId,
    days: [{ id: dayId, name: "اليوم الأول", date: new Date().toISOString().slice(0, 10), items: [] }],
    targets: {},
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || !Array.isArray(parsed.days) || !parsed.days.length) return defaultState();
    return { ...defaultState(), ...parsed, targets: parsed.targets || {} };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function activeDay() {
  let day = state.days.find((d) => d.id === state.activeDayId);
  if (!day) {
    state.activeDayId = state.days[0].id;
    day = state.days[0];
  }
  return day;
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => refs.toast.classList.remove("show"), 2200);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

function normalizeText(value) {
  return String(value || "").trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function currentTotals() {
  return calculateTotals(activeDay().items, foodLookup);
}

function displayValue(food, nutrient, grams) {
  if (food.traceNutrients?.includes(nutrient.key) && normalizeGrams(grams) > 0) {
    return `<span title="Trace — قيمة نوعية غير رقمية في المصدر">T</span>`;
  }
  return formatNumber(calculateFood(food, grams).values[nutrient.key]);
}

function renderCategoryOptions() {
  refs.categorySelect.innerHTML = `<option value="">كل التصنيفات</option>` + db.categories.map(
    (c) => `<option value="${c.id}">${escapeHtml(c.nameAr)}</option>`
  ).join("");
}

function renderDaySelect() {
  refs.daySelect.innerHTML = state.days.map((d) =>
    `<option value="${d.id}" ${d.id === state.activeDayId ? "selected" : ""}>${escapeHtml(d.name)} — ${escapeHtml(d.date || "")}</option>`
  ).join("");
}

function renderTableHead() {
  refs.tableHead.innerHTML = `<tr>
    <th class="food-col">الصنف</th>
    <th class="qty-col">الكمية<span class="unit">g</span></th>
    ${NUTRIENTS.map((n) => `<th>${n.short}<span class="unit">${n.unit}</span></th>`).join("")}
    <th>حذف</th>
  </tr>`;
}

function renderAll() {
  renderDaySelect();
  renderAnalysis();
  renderReferences();
}

function renderAnalysis() {
  const day = activeDay();
  const totals = currentTotals();
  refs.selectedCount.textContent = formatNumber(day.items.length, 0);
  el("sumEnergy").textContent = formatNumber(totals.energy);
  el("sumProtein").textContent = formatNumber(totals.protein);
  el("sumCarbs").textContent = formatNumber(totals.carbohydrates);
  el("sumFats").textContent = formatNumber(totals.fats);
  el("sumFiber").textContent = formatNumber(totals.fiber);

  const hasItems = day.items.length > 0;
  refs.emptyState.hidden = hasItems;
  refs.desktopTableWrap.hidden = !hasItems;
  refs.mobileCards.hidden = !hasItems;

  const selectedFoods = day.items.map((i) => foodLookup.get(i.foodId)).filter(Boolean);
  refs.traceNotice.hidden = !selectedFoods.some((f) => f.traceNutrients?.length);

  if (!hasItems) {
    refs.tableBody.innerHTML = "";
    refs.tableFoot.innerHTML = "";
    refs.mobileCards.innerHTML = "";
    return;
  }

  refs.tableBody.innerHTML = day.items.map((item) => {
    const food = foodLookup.get(item.foodId);
    if (!food) return "";
    return `<tr data-food-id="${food.id}">
      <td class="food-col"><b>${escapeHtml(food.name)}</b><span class="food-meta">${escapeHtml(food.categoryAr)} · المصدر #${food.sourceNumber}</span></td>
      <td class="qty-col"><input class="qty-input" data-action="qty" data-id="${food.id}" type="number" min="0" step="0.1" inputmode="decimal" value="${item.grams}"></td>
      ${NUTRIENTS.map((n) => `<td>${displayValue(food, n, item.grams)}</td>`).join("")}
      <td><button class="delete-row" data-action="delete" data-id="${food.id}" aria-label="حذف ${escapeHtml(food.name)}">×</button></td>
    </tr>`;
  }).join("");

  refs.tableFoot.innerHTML = `<tr>
    <td class="food-col">المجموع</td><td class="qty-col">—</td>
    ${NUTRIENTS.map((n) => `<td>${formatNumber(totals[n.key])}</td>`).join("")}
    <td>—</td>
  </tr>`;

  const primary = NUTRIENTS.filter((n) => n.primary);
  const micro = NUTRIENTS.filter((n) => !n.primary);
  refs.mobileCards.innerHTML = day.items.map((item) => {
    const food = foodLookup.get(item.foodId);
    if (!food) return "";
    return `<article class="food-card" data-food-id="${food.id}">
      <div class="food-card-head">
        <div><h3>${escapeHtml(food.name)}</h3><span class="food-meta">${escapeHtml(food.categoryAr)} · #${food.sourceNumber}</span></div>
        <button class="delete-row" data-action="delete" data-id="${food.id}" aria-label="حذف">×</button>
      </div>
      <div class="card-qty"><label>الكمية</label><input class="qty-input" data-action="qty" data-id="${food.id}" type="number" min="0" step="0.1" value="${item.grams}"><span>جرام</span></div>
      <div class="macro-grid">
        ${primary.map((n) => `<div class="macro"><span>${n.label}</span><strong>${displayValue(food, n, item.grams)} ${n.unit}</strong></div>`).join("")}
      </div>
      <button class="details-toggle" data-action="details" type="button">عرض كل العناصر</button>
      <div class="micro-grid" hidden>
        ${micro.map((n) => `<div class="micro-item"><span>${n.label}</span><b>${displayValue(food, n, item.grams)} ${n.unit}</b></div>`).join("")}
      </div>
    </article>`;
  }).join("");
}

function renderReferences() {
  const totals = currentTotals();
  refs.referenceGrid.innerHTML = TARGET_NUTRIENTS.map((n) => {
    const rawTarget = state.targets[n.key];
    const target = rawTarget === "" || rawTarget == null ? null : Number(rawTarget);
    const hasTarget = Number.isFinite(target) && target >= 0;
    const delta = hasTarget ? totals[n.key] - target : null;
    const cls = delta == null ? "delta-empty" : delta > 0 ? "delta-pos" : delta < 0 ? "delta-neg" : "";
    const deltaText = delta == null ? "غير محدد" : `${delta > 0 ? "+" : ""}${formatNumber(delta)} ${n.unit}`;
    return `<article class="reference-card">
      <h3>${n.label} <small>${n.unit}</small></h3>
      <div class="reference-values">
        <div><span>المجموع</span><strong>${formatNumber(totals[n.key])}</strong></div>
        <div><span>المرجع</span><strong>${hasTarget ? formatNumber(target) : "—"}</strong></div>
        <div><span>الفرق</span><strong class="${cls}">${deltaText}</strong></div>
      </div>
    </article>`;
  }).join("");
}

function openSearch() {
  const query = normalizeText(refs.foodSearch.value);
  const categoryId = refs.categorySelect.value;
  let results = db.foods.filter((food) => {
    if (categoryId && food.categoryId !== categoryId) return false;
    if (!query) return true;
    return normalizeText(`${food.name} ${food.category} ${food.categoryAr}`).includes(query);
  }).slice(0, 30);

  refs.searchResults.innerHTML = results.length ? results.map((food) =>
    `<button class="search-result" type="button" data-food-id="${food.id}">
      <span>${escapeHtml(food.name)}</span>
      <small>${escapeHtml(food.categoryAr)}</small>
    </button>`
  ).join("") : `<div class="search-result"><span>لا توجد نتائج مطابقة</span></div>`;
  refs.searchResults.hidden = false;
}

function closeSearch() {
  setTimeout(() => { refs.searchResults.hidden = true; }, 120);
}

function addFood(foodId) {
  const day = activeDay();
  const existing = day.items.find((i) => i.foodId === foodId);
  if (existing) {
    showToast("الصنف موجود بالفعل — عدّل الكمية من الجدول");
    const node = document.querySelector(`[data-food-id="${CSS.escape(foodId)}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  day.items.push({ foodId, grams: 100 });
  saveState();
  renderAll();
  refs.foodSearch.value = "";
  refs.searchResults.hidden = true;
  showToast("تمت إضافة الصنف بكمية 100 جرام");
}

function updateQuantity(foodId, value) {
  const item = activeDay().items.find((i) => i.foodId === foodId);
  if (!item) return;
  item.grams = normalizeGrams(value);
  saveState();
  renderAnalysis();
  renderReferences();
}

function deleteFood(foodId) {
  const day = activeDay();
  day.items = day.items.filter((i) => i.foodId !== foodId);
  saveState();
  renderAll();
}

function newDay() {
  const name = prompt("اسم اليوم الجديد:", `اليوم ${state.days.length + 1}`);
  if (name === null) return;
  const id = crypto.randomUUID?.() || `d-${Date.now()}`;
  state.days.push({ id, name: name.trim() || `اليوم ${state.days.length + 1}`, date: new Date().toISOString().slice(0, 10), items: [] });
  state.activeDayId = id;
  saveState(); renderAll(); showToast("تم إنشاء يوم جديد");
}

function renameDay() {
  const day = activeDay();
  const name = prompt("الاسم الجديد لليوم:", day.name);
  if (name === null) return;
  const cleaned = name.trim();
  if (!cleaned) return;
  day.name = cleaned;
  saveState(); renderDaySelect(); showToast("تم تغيير اسم اليوم");
}

function duplicateDay() {
  const source = activeDay();
  const id = crypto.randomUUID?.() || `d-${Date.now()}`;
  const copy = { ...structuredClone(source), id, name: `${source.name} — نسخة` };
  state.days.push(copy); state.activeDayId = id;
  saveState(); renderAll(); showToast("تم نسخ اليوم");
}

function deleteDay() {
  if (state.days.length === 1) {
    if (!confirm("هذا هو اليوم الوحيد. هل تريد مسح محتواه بدلًا من حذفه؟")) return;
    activeDay().items = [];
  } else {
    if (!confirm(`حذف "${activeDay().name}"؟ لا يمكن التراجع.`)) return;
    state.days = state.days.filter((d) => d.id !== state.activeDayId);
    state.activeDayId = state.days[0].id;
  }
  saveState(); renderAll();
}

function clearDay() {
  if (!activeDay().items.length) return;
  if (!confirm("مسح كل الأصناف من اليوم الحالي؟")) return;
  activeDay().items = [];
  saveState(); renderAll(); showToast("تم مسح اليوم");
}

function buildTargetsForm() {
  refs.targetsInputs.innerHTML = TARGET_NUTRIENTS.map((n) => `
    <label class="target-field">
      <span>${n.label}</span>
      <div class="input-unit">
        <input type="number" min="0" step="0.01" data-target="${n.key}" value="${state.targets[n.key] ?? ""}" placeholder="—">
        <small>${n.unit}</small>
      </div>
    </label>`).join("");
}

function openTargets() {
  buildTargetsForm();
  refs.targetsDialog.showModal();
}

function saveTargets() {
  const next = {};
  refs.targetsInputs.querySelectorAll("[data-target]").forEach((input) => {
    const value = input.value.trim();
    next[input.dataset.target] = value === "" ? "" : normalizeGrams(value);
  });
  state.targets = next;
  saveState(); renderReferences(); refs.targetsDialog.close(); showToast("تم حفظ القيم المرجعية");
}

function clearTargets() {
  refs.targetsInputs.querySelectorAll("[data-target]").forEach((input) => input.value = "");
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function exportCsv() {
  const day = activeDay();
  if (!day.items.length) return showToast("أضف صنفًا واحدًا على الأقل أولًا");
  const header = ["Food","Category","Quantity_g",...NUTRIENTS.map((n) => `${n.key}_${n.unit.replace(/\s/g,"_")}`)];
  const rows = day.items.map((item) => {
    const food = foodLookup.get(item.foodId);
    const calc = calculateFood(food, item.grams);
    return [food.name, food.category, item.grams, ...NUTRIENTS.map((n) => csvNumber(calc.values[n.key]))];
  });
  const totals = currentTotals();
  rows.push(["TOTAL","", "", ...NUTRIENTS.map((n) => csvNumber(totals[n.key]))]);
  const quote = (v) => `"${String(v ?? "").replaceAll('"','""')}"`;
  const csv = "\uFEFF" + [header,...rows].map((r) => r.map(quote).join(",")).join("\n");
  downloadFile(`${day.name.replace(/[\\/:*?"<>|]/g,"-")}.csv`, csv, "text/csv;charset=utf-8");
}

function exportBackup() {
  downloadFile("egypt-food-analyzer-backup.json", JSON.stringify(state, null, 2), "application/json");
}

async function restoreBackup(file) {
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || !Array.isArray(parsed.days) || !parsed.days.length || typeof parsed.targets !== "object") throw new Error("invalid");
    state = parsed;
    saveState(); renderAll(); showToast("تم استيراد النسخة الاحتياطية");
  } catch {
    alert("ملف النسخة الاحتياطية غير صالح.");
  } finally {
    refs.restoreInput.value = "";
  }
}

function bindEvents() {
  refs.foodSearch.addEventListener("input", openSearch);
  refs.foodSearch.addEventListener("focus", openSearch);
  refs.foodSearch.addEventListener("blur", closeSearch);
  refs.categorySelect.addEventListener("change", openSearch);
  refs.searchResults.addEventListener("mousedown", (e) => {
    const btn = e.target.closest("[data-food-id]");
    if (btn) addFood(btn.dataset.foodId);
  });
  refs.daySelect.addEventListener("change", (e) => { state.activeDayId = e.target.value; saveState(); renderAll(); });
  el("newDayBtn").addEventListener("click", newDay);
  el("renameDayBtn").addEventListener("click", renameDay);
  el("duplicateDayBtn").addEventListener("click", duplicateDay);
  el("deleteDayBtn").addEventListener("click", deleteDay);
  el("clearDayBtn").addEventListener("click", clearDay);

  const handleAnalysisClick = (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    if (target.dataset.action === "delete") deleteFood(target.dataset.id);
    if (target.dataset.action === "details") {
      const grid = target.nextElementSibling;
      grid.hidden = !grid.hidden;
      target.textContent = grid.hidden ? "عرض كل العناصر" : "إخفاء العناصر";
    }
  };
  refs.tableBody.addEventListener("click", handleAnalysisClick);
  refs.mobileCards.addEventListener("click", handleAnalysisClick);
  const qtyHandler = (e) => {
    if (e.target.dataset.action === "qty") updateQuantity(e.target.dataset.id, e.target.value);
  };
  refs.tableBody.addEventListener("change", qtyHandler);
  refs.mobileCards.addEventListener("change", qtyHandler);

  el("targetsBtn").addEventListener("click", openTargets);
  el("targetsBtn2").addEventListener("click", openTargets);
  el("saveTargetsBtn").addEventListener("click", (e) => { e.preventDefault(); saveTargets(); });
  el("clearTargetsBtn").addEventListener("click", clearTargets);
  el("printBtn").addEventListener("click", () => window.print());
  el("exportCsvBtn").addEventListener("click", exportCsv);
  el("backupBtn").addEventListener("click", exportBackup);
  refs.restoreInput.addEventListener("change", (e) => e.target.files[0] && restoreBackup(e.target.files[0]));
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
      e.preventDefault(); refs.foodSearch.focus();
    }
    if (e.key === "Escape") refs.searchResults.hidden = true;
  });
}

async function init() {
  try {
    const manifestRes = await fetch("./data/manifest.json");
    if (!manifestRes.ok) throw new Error(`Manifest HTTP ${manifestRes.status}`);
    const manifest = await manifestRes.json();
    const csvTexts = await Promise.all(manifest.files.map(async (entry) => {
      const res = await fetch(`./data/${entry.file}`);
      if (!res.ok) throw new Error(`${entry.file} HTTP ${res.status}`);
      return res.text();
    }));
    db = assembleFoodDatabase(manifest, csvTexts);
    foodLookup = new Map(db.foods.map((f) => [f.id, f]));
    renderCategoryOptions();
    renderTableHead();
    bindEvents();
    renderAll();
  } catch (err) {
    document.body.innerHTML = `<main class="shell" style="padding:40px"><section class="panel" style="padding:24px"><h1>تعذر تحميل قاعدة بيانات الأغذية</h1><p>شغّل الموقع عبر خادم HTTP بدل فتح ملف index.html مباشرة.</p><pre>${escapeHtml(err.message)}</pre></section></main>`;
  }
}

init();
