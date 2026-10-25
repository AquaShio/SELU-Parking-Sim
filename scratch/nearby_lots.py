import json
import math

with open('backend/data/maps/selu_campus.json', encoding='utf-8') as f:
    d = json.load(f)

buildings = d.get('buildings', [])
lots = d.get('lots', [])

search_bldgs = ['Fayard', 'Anzalone', 'Meade', 'Campbell', 'Pottle', 'Vickers', 'Mims', 'Dyson', 'Garrett', 'White', 'Library', 'TEC']

for b in buildings:
    b_name = b.get('name', '')
    if any(s.lower() in b_name.lower() for s in search_bldgs):
        bx = b['rect'][0] + b['rect'][2] / 2
        by = b['rect'][1] + b['rect'][3] / 2
        print(f"\nBuilding: {b_name} at ({bx:.0f}, {by:.0f})")
        # Find closest lots
        lot_dists = []
        for l in lots:
            poly = l.get('polygon', [])
            if not poly: continue
            lx = sum(p[0] for p in poly) / len(poly)
            ly = sum(p[1] for p in poly) / len(poly)
            dist = math.hypot(bx - lx, by - ly)
            lot_dists.append((dist, l))
        lot_dists.sort(key=lambda x: x[0])
        for dist, l in lot_dists[:4]:
            stalls = l.get('stalls', [])
            types = set(s.get('stall_type') for s in stalls)
            print(f"   -> {dist:5.0f}px | [{l['id']}] {l.get('name', ''):30} | {len(stalls)} stalls | types: {types}")
