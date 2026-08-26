#!/usr/bin/env python3
"""Normalize Sheet1 from the source XLSX into data/foods.json using stdlib only."""
from __future__ import annotations
import argparse, json, re, sys, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source" / "food-composition-egypt.xlsx"
OUTPUT = ROOT / "data" / "foods.json"

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
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}

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
    out = []
    for si in root.findall("m:si", NS):
        out.append("".join((t.text or "") for t in si.iterfind(".//m:t", NS)))
    return out

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

def build():
    foods, categories = [], []
    current = None
    cat_idx = -1
    for rownum, row in read_rows(SOURCE):
        a, b = row[0], row[1]
        if isinstance(a, str) and row[2] == "g" and row[3] == "Kcal":
            current = a.strip()
            cat_idx += 1
            categories.append({"id": f"c{cat_idx+1:02d}", "name": current, "nameAr": CATEGORY_AR.get(current, current)})
            continue
        if isinstance(a, (int, float)) and not isinstance(a, bool) and isinstance(b, str) and b.strip():
            values, trace, raw_quality = {}, [], {}
            for key, val in zip(FIELDS, row[2:20]):
                if isinstance(val, (int, float)) and not isinstance(val, bool):
                    values[key] = float(val)
                elif isinstance(val, str) and val.strip().upper() == "T":
                    values[key] = 0.0
                    trace.append(key)
                    raw_quality[key] = val.strip()
                else:
                    raise ValueError(f"Unexpected value at row {rownum}, {key}: {val!r}")
            item = {
                "id": f"r{rownum:03d}",
                "sourceNumber": int(a), "sourceRow": rownum,
                "categoryId": f"c{cat_idx+1:02d}", "category": current,
                "categoryAr": CATEGORY_AR.get(current, current), "name": b.strip(),
                **values,
            }
            if trace:
                item["traceNutrients"] = trace
                item["rawQualitativeValues"] = raw_quality
            foods.append(item)
    return {
        "meta": {
            "title": "Food Composition tables For Egypt",
            "sheet": "Sheet1", "foodCount": len(foods), "categoryCount": len(categories),
            "basisGrams": 100,
            "qualitativeHandling": "A source value of 'T' means trace. It is preserved in traceNutrients/rawQualitativeValues and treated as 0 only for arithmetic totals because the source provides no numeric magnitude."
        },
        "categories": categories, "foods": foods,
    }

def encoded(data):
    return json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail if data/foods.json differs from the source workbook")
    args = parser.parse_args()
    built = encoded(build())
    if args.check:
        current = OUTPUT.read_text(encoding="utf-8") if OUTPUT.exists() else ""
        if current != built:
            print("data/foods.json is out of date. Run: python3 scripts/import-foods.py", file=sys.stderr)
            raise SystemExit(1)
        data = json.loads(built)
        print(f"OK: {data['meta']['foodCount']} foods, {data['meta']['categoryCount']} categories; JSON matches source workbook.")
        return
    OUTPUT.write_text(built, encoding="utf-8")
    data = json.loads(built)
    print(f"Wrote {OUTPUT}: {data['meta']['foodCount']} foods, {data['meta']['categoryCount']} categories.")

if __name__ == "__main__":
    main()
