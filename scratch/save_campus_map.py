import json
import urllib.request

key = "0001085cc708b9cef47080f064612ca5"
cat_map = {
    104746: "faculty",
    104752: "upperclass",
    104745: "freshman",
    104751: "resident",
    104768: "visitor",
    104769: "visitor",
    104773: "visitor",
}

official_types = {}
for cat_id, p_type in cat_map.items():
    url = f"https://api.concept3d.com/categories/{cat_id}?map=2329&children&key={key}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            locs = data.get('children', {}).get('locations', [])
            for loc in locs:
                official_types[f"lot_{loc['id']}"] = (p_type, loc['name'])
            subcats = data.get('children', {}).get('categories', [])
            for sc in subcats:
                sc_url = f"https://api.concept3d.com/categories/{sc['catId']}?map=2329&children&key={key}"
                sc_req = urllib.request.Request(sc_url, headers={"User-Agent": "Mozilla/5.0"})
                try:
                    with urllib.request.urlopen(sc_req) as sc_resp:
                        sc_data = json.loads(sc_resp.read().decode('utf-8'))
                        for loc in sc_data.get('children', {}).get('locations', []):
                            official_types[f"lot_{loc['id']}"] = (p_type, loc['name'])
                except Exception:
                    pass
    except Exception as e:
        print(f"Error fetching cat {cat_id}: {e}")

with open('backend/data/maps/selu_campus.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

updated_count = 0
for lot in d['lots']:
    lot_id = lot['id']
    if lot_id in official_types:
        target_permit, off_name = official_types[lot_id]
        lot['permit_type'] = target_permit
        for s in lot.get('stalls', []):
            s['stall_type'] = target_permit
            s['lot_id'] = lot_id
        updated_count += 1
    else:
        # Fallback based on lot name
        name_lower = lot.get('name', '').lower()
        if 'f/s' in name_lower or 'faculty' in name_lower:
            lot['permit_type'] = 'faculty'
            for s in lot.get('stalls', []):
                s['stall_type'] = 'faculty'
                s['lot_id'] = lot_id
            updated_count += 1

with open('backend/data/maps/selu_campus.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, indent=2)

print(f"Successfully saved {updated_count} updated lots to backend/data/maps/selu_campus.json")
