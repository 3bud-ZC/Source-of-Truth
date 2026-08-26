# Egypt Food Analyzer — محلل الأغذية المصري

Static Arabic-first food analysis web app built from the supplied **Food Composition Tables for Egypt** workbook.

## What it does

- Search 470 food records from 15 categories.
- Add foods to a daily analysis and enter quantity in grams.
- Calculate energy, macros, minerals, and vitamins automatically using:
  `calculated value = source value × grams / 100`
- Show running totals instantly after each saved quantity change.
- Save multiple days locally in the browser.
- Configure optional reference targets and view total / target / difference.
- Export the current day as CSV.
- Print the current analysis.
- Export/import a JSON backup.
- Responsive Arabic RTL interface with mobile food cards.
- No backend, no account, and no paid API.

## Source of truth

The original workbook is committed at:

`source/food-composition-egypt.xlsx`

Runtime data is generated from **Sheet1** into:

`data/manifest.json` + `data/part*.csv`

Current normalized dataset:

- **470 food records**
- **15 categories**
- **18 nutritional fields**
- Source basis: **100 g**

The workbook contains one qualitative `T` (Trace) value. The importer preserves that marker in
`traceNutrients` / `rawQualitativeValues` and uses numeric `0` only for arithmetic totals because the source provides no numeric magnitude. The UI shows a trace notice when that food is selected.

## Regenerate the data

No third-party Python packages are required.

```bash
python3 scripts/import-foods.py
```

Verify that the committed runtime data exactly matches the workbook:

```bash
python3 scripts/import-foods.py --check
```

## Run locally

Because the browser loads the manifest and CSV chunks with `fetch`, use a local HTTP server instead of opening `index.html` directly:

```bash
python3 -m http.server 8000
```

Then open:

`http://localhost:8000`

## Tests

No npm dependencies are required.

```bash
npm test
```

The test suite verifies dataset count, category count, unique IDs, numeric nutrient values, 100 g / 50 g / 200 g calculations, totals, and the qualitative trace marker.

## GitHub Pages

Deployment is configured in:

`.github/workflows/deploy-pages.yml`

Every push to `main`:

1. checks out the repository,
2. verifies the generated manifest and CSV chunks against the XLSX source,
3. runs the Node test suite,
4. uploads the static site,
5. deploys it to GitHub Pages.

Expected public URL after Pages is enabled and the workflow completes:

`https://3bud-zc.github.io/Source-of-Truth/`

If the first deployment reports that Pages is not configured, open **Repository Settings → Pages → Build and deployment → Source → GitHub Actions**, then rerun the workflow.

## Privacy

All user analysis data is stored in `localStorage` inside the browser. The site does not send food selections, quantities, saved days, or reference values to a server.

## Important data note

This application performs arithmetic on the supplied food-composition table. User-entered reference values are optional and are **not** presented as personalized medical recommendations.
