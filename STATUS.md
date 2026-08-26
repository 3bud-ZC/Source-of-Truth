# STATUS.md

## Project
Egypt Food Analyzer / محلل الأغذية المصري

## Completion
**95% — Release candidate committed locally; live GitHub Pages deployment still needs verification after push.**

## Implemented
- Arabic-first RTL static web application.
- Search across the complete normalized Sheet1 dataset.
- Category filtering.
- Food selection with duplicate protection.
- Quantity entry in grams.
- Proportional nutrient calculation from a 100 g basis.
- Energy, protein, fat, carbohydrate, fiber, water, minerals, and vitamin calculations.
- Total row for all nutrients.
- Summary cards for calories and macros.
- Multi-day localStorage persistence.
- Create, rename, duplicate, switch, delete, and clear days.
- Optional editable reference targets.
- Total / target / difference comparison.
- CSV export.
- Print layout.
- JSON backup export/import.
- Desktop wide sticky nutrient table.
- Mobile responsive food cards and expandable micronutrients.
- Source-trace handling for qualitative `T` values.
- GitHub Pages deployment workflow.
- Source XLSX retained in repository.
- Deterministic XLSX → JSON import script using Python standard library only.

## Source Dataset
- Workbook: `source/food-composition-egypt.xlsx`
- Worksheet: `Sheet1`
- Normalized food records: **470**
- Categories: **15**
- Nutrient fields: **18**
- Basis: **100 g**
- Workbook SHA-256: `5a77ca42716fdc4d53ecdeca6d97c28f17dc53f5542f19bcb5e2d2f1bc09568d`

### Data integrity
All 470 normalized records were compared against the uploaded workbook values through an independent workbook read during development: **0 mismatches**.

One source value is qualitative:
- `Chickpeas,(Homos sham)` — Vitamin A = `T` (Trace)
- The marker is preserved in the generated dataset.
- No numeric amount was invented.

## Verification
- `python3 scripts/import-foods.py --check` → PASS
- `npm test` → **7/7 PASS**
- `node --check app.js` → PASS
- `node --check nutrition.js` → PASS
- Local HTTP smoke test for `/` and `/data/foods.json` → PASS

## Deployment
Workflow: `.github/workflows/deploy-pages.yml`

Expected Pages URL:
`https://3bud-zc.github.io/Source-of-Truth/`

## Remaining
- Push this implementation to `main`.
- Verify the GitHub Actions Pages workflow completes successfully.
- If GitHub Pages has never been enabled for this repository, set Pages source to **GitHub Actions** once in repository settings and rerun the workflow.

## Next action
Push the release candidate to `main`, inspect the resulting workflow run, then update this file to 100% only after the live Pages URL is verified.
