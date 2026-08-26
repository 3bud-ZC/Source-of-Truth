# STATUS.md

## Project
Egypt Food Analyzer / محلل الأغذية المصري

## Completion
**99% — core product is complete and the responsive redesign is committed. Only redeploying the latest UI revision and live-device verification remain.**

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

## Responsive / UI Upgrade
Latest redesign committed to `main` includes:
- Stronger visual hierarchy and modern nutrition-dashboard styling.
- Refined green system, spacing, shadows, borders, and section hierarchy.
- Improved sticky desktop header and table presentation.
- Better desktop control layout and metric cards.
- Mobile-first layouts for 700 px, 430 px, and 360 px breakpoints.
- Dedicated mobile food cards instead of squeezing the desktop nutrient table.
- Fixed mobile bottom navigation for Add Food / Totals / Reference Values.
- Mobile quantity `-10 g` / `+10 g` controls injected by `mobile.js`.
- Mobile-safe-area handling for modern iPhone/Android browsers.
- Better dialogs, search results, empty states, reference cards, and touch targets.
- Improved printable mode preserved.

## Source Dataset
- Worksheet used: `Sheet1`
- Runtime source snapshot: `data/manifest.json` + `data/part1.csv` through `data/part4.csv`
- Normalized food records: **470**
- Categories: **15**
- Nutrient fields: **18**
- Basis: **100 g**
- Original uploaded workbook SHA-256: `5a77ca42716fdc4d53ecdeca6d97c28f17dc53f5542f19bcb5e2d2f1bc09568d`

### Data integrity
All 470 normalized records were compared against the uploaded workbook values during development: **0 mismatches**.

One source value is qualitative:
- `Chickpeas,(Homos sham)` — Vitamin A = `T` (Trace)
- The marker is preserved in the runtime dataset.
- No numeric amount was invented.

## Verification
Previously verified core release:
- `python3 scripts/import-foods.py --check` against the supplied workbook → PASS
- `npm test` → **7/7 PASS**
- `node --check app.js` → PASS
- `node --check data.js` → PASS
- `node --check nutrition.js` → PASS
- Local HTTP smoke test for `/` and `/data/manifest.json` → PASS

Latest workflow now also includes:
- `node --check mobile.js`

## GitHub Repository
Repository: `3bud-ZC/Source-of-Truth`
Branch: `main`

Latest UI files:
- `index.html`
- `styles.css`
- `mobile.js`

## Deployment
Workflow: `.github/workflows/deploy-pages.yml`

Public URL:
`https://3bud-zc.github.io/Source-of-Truth/`

GitHub Pages is configured to use **GitHub Actions**.
The first deployment run completed successfully before the latest responsive redesign.
Because the latest connector commits did not automatically create a new workflow run, the latest design revision still needs one manual workflow run from the Actions tab.

## Remaining
- Run `Deploy GitHub Pages` once from the Actions tab on `main` to publish the latest redesign.
- Verify the latest revision on a real mobile device at approximately 360–430 px width.
- Verify desktop after the new deployment.

## Next action
Run the Pages workflow once, open the live site on phone and desktop, then perform the final visual QA and mark this file **100%**.
