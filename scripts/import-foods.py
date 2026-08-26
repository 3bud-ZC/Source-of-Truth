#!/usr/bin/env python3
"""Normalize Sheet1 from the source XLSX into chunked runtime CSV files using stdlib only."""
from __future__ import annotations
import argparse, csv, io, json, re, sys, zipfile
from collections import OrderedDict
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "source" / "food-composition-egypt.xlsx"
DATA_DIR = ROOT / "data"

CATEGORY_AR = {
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
}
FIELDS = [
    "water","energy","protein","fats","fiber","carbohydrates","sodium","potassium",
    "calcium","phosphorus","magnesium","iron","zinc","copper","vitaminA","vitaminC",
    "vitaminB1","vitaminB2"
]
HEADER = ["sourceNumber","sourceRow","categoryId","category","name",*FIELDS]
CHUNK_GROUPS = [
    ["c01","c02","c03","c04"],
    ["c05","c06","c07","c08"],
    ["c09","c10","c11","c12"],
    ["c13","c14","c15"],
]
NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

def col_index(ref: str) -> int:
    letters = re.match(r"[A-Z]+", ref).group(0)
    n = 0
    for c in letters:
        n = n * 26 + ord(c) - 64
    return n - 1

def shared_strings(zf: zipfile.ZipFile):
    try:
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return ["".join((t.text or "") for t in si.iterfind(".//m:t", NS)) for si in root.findall("m:si", NS)]

def first_sheet_path(zf: zipfile.ZipFile) -> str:
    wb = ET.fromstring(zf.read("xl/workbook.xml"))
    sheet = wb.find("m:sheets/m:sheet", NS)
    rel_id = sheet.attrib[f"{{{NS['r']}}}id"]
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    for rel in rels:
        if rel.attrib.get("Id") == rel_id:
            target = rel.attrib["Target"].lstrip("/")
            return target if target.startswith("xl/") else f"xl/{target}"
    raise RuntimeError("Could not resolve first worksheet")

def read_rows(path: Path):
    with zipfile.ZipFile(path) as zf:
        ss = shared_strings(zf)
        sheet_xml = ET.fromstring(zf.read(first_sheet_path(zf)))
        rows = []
        for row in sheet_xml.findall(".//m:sheetData/m:row", NS):
            cells = [None] * 20
            for c in row.findall("m:c", NS):
                idx = col_index(c.attrib["r"])
                if idx >= 20:
                    continue
                t = c.attrib.get("t")
                if t == "inlineStr":
                    node = c.find("m:is/m:t", NS)
                    value = node.text if node is not None else ""
                else:
                    v = c.find("m:v", NS)
                    raw = v.text if v is not None else None
                    if raw is None:
                        value = None
                    elif t == "s":
                        value = ss[int(raw)]
                    elif t == "str":
                        value = raw
                    else:
                        try:
                            num = float(raw)
                            value = int(num) if num.is_integer() else num
                        except ValueError:
                            value = raw
                cells[idx] = value
            rows.append((int(row.attrib["r"]), cells))
        return rows

def build(source: Path):
    categories = []
    rows_by_category = OrderedDict()
    current = None
    category_index = -1
    for rownum, row in read_rows(source):
        a, b = row[0], row[1]
        if isinstance(a, str) and row[2] == "g" and row[3] == "Kcal":
            current = a.strip()
            category_index += 1
            cid = f"c{category_index+1:02d}"
            categories.append({"id": cid, "name": current, "nameAr": CATEGORY_AR.get(current, current)})
            rows_by_category[cid] = []
            continue
        if isinstance(a, (int, float)) and not isinstance(a, bool) and isinstance(b, str) and b.strip():
            nutrients = []
            for key, val in zip(FIELDS, row[2:20]):
                if isinstance(val, (int, float)) and not isinstance(val, bool):
                    nutrients.append(int(val) if float(val).is_integer() else val)
                elif isinstance(val, str) and val.strip().upper() == "T":
                    nutrients.append("T")
                else:
                    raise ValueError(f"Unexpected value at row {rownum}, {key}: {val!r}")
            cid = f"c{category_index+1:02d}"
            rows_by_category[cid].append([int(a), rownum, cid, current, b.strip(), *nutrients])
    return categories, rows_by_category

def csv_text(rows):
    out = io.StringIO(newline="")
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(HEADER)
    writer.writerows(rows)
    return out.getvalue()

def outputs(source: Path):
    categories, rows_by_category = build(source)
    files = {}
    chunks = []
    for idx, group in enumerate(CHUNK_GROUPS, 1):
        rows = []
        for cid in group:
            rows.extend(rows_by_category[cid])
        filename = f"part{idx}.csv"
        files[filename] = csv_text(rows)
        chunks.append({"file": filename, "count": len(rows)})

    category_manifest = []
    for cat in categories:
        category_manifest.append({**cat, "count": len(rows_by_category[cat["id"]])})

    manifest = {
        "title": "Food Composition tables For Egypt",
        "sheet": "Sheet1",
        "foodCount": sum(len(v) for v in rows_by_category.values()),
        "categoryCount": len(categories),
        "basisGrams": 100,
        "categories": category_manifest,
        "chunks": chunks,
    }
    files["manifest.json"] = json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n"
    return files, manifest

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE, help="Path to the source XLSX workbook")
    parser.add_argument("--check", action="store_true", help="Fail if committed runtime data differs from the source workbook")
    args = parser.parse_args()
    if not args.source.exists():
        print(f"Source workbook not found: {args.source}", file=sys.stderr)
        raise SystemExit(2)

    built, manifest = outputs(args.source)
    if args.check:
        mismatches = []
        for name, content in built.items():
            path = DATA_DIR / name
            if not path.exists() or path.read_text(encoding="utf-8") != content:
                mismatches.append(name)
        if mismatches:
            print("Runtime data is out of date: " + ", ".join(mismatches), file=sys.stderr)
            raise SystemExit(1)
        print(f"OK: {manifest['foodCount']} foods, {manifest['categoryCount']} categories; runtime data matches source workbook.")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for name, content in built.items():
        (DATA_DIR / name).write_text(content, encoding="utf-8")
    print(f"Wrote {manifest['foodCount']} foods into {len(manifest['chunks'])} runtime chunks.")

if __name__ == "__main__":
    main()
