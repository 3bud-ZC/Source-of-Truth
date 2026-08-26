# STATUS.md

## Project
Egypt Food Analyzer / محلل الأغذية المصري

## Completion
**98% — application, source-derived runtime dataset, tests, and GitHub Pages workflow are committed. Live Pages deployment is the only remaining verification.**

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
- Deterministic XLSX → split CSV/manifest importer using Python standard library only.

## Source Dataset
- Worksheet used: `Sheet1`
- Runtime source snapshot: `data/manifest.json` + `data/part1.csv` through `data/part4.csv`
- Normalized food records: **470**
- Categories: **15**
- Nutrient fields: **18**
- Basis: **100 g**
- Original uploaded workbook SHA-256: `5a77ca42716fdc4d53ecdeca6d97c28f17dc53f5542f19bcb5e2d2f1bc09568d`
- The original XLSX is not required by the deployed static website.

### Data integrity
All 470 normalized records were compared against the uploaded workbook values during development: **0 mismatches**.

One source value is qualitative:
- `Chickpeas,(Homos sham)` — Vitamin A = `T` (Trace)
- The marker is preserved in the runtime dataset.
- No numeric amount was invented.

## Verification
- `python3 scripts/import-foods.py --check` against the supplied workbook → PASS
- `npm test` → **7/7 PASS**
- `node --check app.js` → PASS
- `node --check data.js` → PASS
- `node --check nutrition.js` → PASS
- Local HTTP smoke test for `/` and `/data/manifest.json` → PASS

## GitHub Repository
Repository: `3bud-ZC/Source-of-Truth`
Branch: `main`

The complete runtime dataset is committed, including `data/part4.csv`.
The app reads `manifest.chunks`, so the committed runtime data format matches the browser loader and test suite.

## Deployment
Workflow: `.github/workflows/deploy-pages.yml`

Expected Pages URL:
`https://3bud-zc.github.io/Source-of-Truth/`

The workflow performs JavaScript syntax checks and the automated Node test suite before deployment.

## Remaining
- Confirm the first GitHub Actions workflow run is created and succeeds.
- Confirm the public GitHub Pages URL loads the application and all four nutrition chunks.
- If Pages is not enabled yet, select **Settings → Pages → Build and deployment → GitHub Actions** and run the deployment workflow once.

## Next action
Trigger/verify the first GitHub Pages deployment, perform a live smoke test, then mark this file **100%**.
