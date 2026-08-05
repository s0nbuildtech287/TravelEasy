# backend/app/service/tourism/tourism_module.py
import os
import json

DATA_PATH = os.path.join(
    os.path.dirname(__file__),
    "..", "..", "..", "..", "data", "vietnam_tourism.jsonl"
)
DATA_PATH = os.path.abspath(DATA_PATH)


def load_tourism_places():
    places = []
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    try:
                        places.append(json.loads(line))
                    except Exception as e:
                        print(f"Error loading line: {e}")
    else:
        print(f"[WARN] File not found: {DATA_PATH}")
    return places


TOURISM_PLACES = load_tourism_places()


def get_all_provinces():
    provinces = sorted(list({p["province"] for p in TOURISM_PLACES if p.get("province")}))
    return provinces


def get_category_tree_by_province(province: str):
    category_map = {}
    for p in TOURISM_PLACES:
        if p.get("province") == province:
            cat = p.get("category")
            if not cat:
                continue
            if cat not in category_map:
                category_map[cat] = set()

            subcats = p.get("sub_category") or []
            if isinstance(subcats, list):
                for s in subcats:
                    if s:
                        category_map[cat].add(s)
            elif isinstance(subcats, str) and subcats.strip():
                category_map[cat].add(subcats.strip())

    return {
        category: sorted(list(subs))
        for category, subs in category_map.items()
    }


def get_places_by_subcategories(province: str, selected_subcats: list[str]):
    rows = [p for p in TOURISM_PLACES if p.get("province") == province]

    # Try case-insensitive search if exact search returns nothing
    if not rows:
        rows = [p for p in TOURISM_PLACES if p.get("province") and p["province"].lower() == province.lower()]

    if not selected_subcats:
        matched_places = rows
    else:
        matched_places = []
        for place in rows:
            subcat_field = place.get("sub_category") or []
            if isinstance(subcat_field, list):
                if any(sc in subcat_field for sc in selected_subcats):
                    matched_places.append(place)
            elif isinstance(subcat_field, str):
                if subcat_field in selected_subcats:
                    matched_places.append(place)

    return matched_places