import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { calculateFood, calculateTotals, NUTRIENTS } from "../nutrition.js";
import { assembleFoodDatabase } from "../data.js";

const dataDir = new URL("../data/", import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL("manifest.json", dataDir), "utf8"));
const csvTexts = manifest.files.map((entry) => fs.readFileSync(new URL(entry.file, dataDir), "utf8"));
const db = assembleFoodDatabase(manifest, csvTexts);
const lookup = new Map(db.foods.map((f) => [f.id, f]));
const sample = db.foods.find((f) => f.name === "Barley,grains");

test("dataset contains the normalized Sheet1 records", () => {
  assert.equal(db.meta.foodCount, 470);
  assert.equal(db.foods.length, 470);
  assert.equal(db.meta.categoryCount, 15);
  assert.equal(db.categories.length, 15);
  assert.equal(manifest.files.reduce((sum, f) => sum + f.count, 0), 470);
});

test("every food has unique id and numeric nutrient values", () => {
  assert.equal(new Set(db.foods.map((f) => f.id)).size, db.foods.length);
  for (const food of db.foods) {
    assert.ok(food.name);
    for (const nutrient of NUTRIENTS) {
      assert.equal(typeof food[nutrient.key], "number", `${food.id}:${nutrient.key}`);
      assert.ok(Number.isFinite(food[nutrient.key]), `${food.id}:${nutrient.key}`);
    }
  }
});

test("100g returns the source values", () => {
  const result = calculateFood(sample, 100);
  assert.equal(result.values.energy, 335);
  assert.equal(result.values.protein, 10.7);
});

test("50g returns exactly half", () => {
  const result = calculateFood(sample, 50);
  assert.equal(result.values.energy, 167.5);
  assert.equal(result.values.protein, 5.35);
});

test("200g returns exactly double", () => {
  const result = calculateFood(sample, 200);
  assert.equal(result.values.energy, 670);
  assert.equal(result.values.protein, 21.4);
});

test("totals equal the mathematical sum", () => {
  const rice = db.foods.find((f) => f.name === "Rice,grains (Long)");
  const items = [{ foodId: sample.id, grams: 100 }, { foodId: rice.id, grams: 50 }];
  const totals = calculateTotals(items, lookup);
  assert.equal(totals.energy, 335 + 357 * 0.5);
  assert.equal(totals.protein, 10.7 + 8.7 * 0.5);
});

test("qualitative trace source values are preserved transparently", () => {
  const traceFood = db.foods.find((f) => f.traceNutrients?.length);
  assert.ok(traceFood);
  assert.ok(traceFood.traceNutrients.includes("vitaminA"));
  assert.equal(traceFood.rawQualitativeValues.vitaminA, "T");
});
