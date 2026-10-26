import json

with open('backend/data/maps/selu_campus.json', encoding='utf-8') as f:
    d = json.load(f)

buildings = {b['id']: b for b in d.get('buildings', [])}

for lot in d.get('lots', []):
    name = lot.get('name', '')
    poly = lot.get('polygon', [])
    if poly:
        avg_x = sum(p[0] for p in poly) / len(poly)
        avg_y = sum(p[1] for p in poly) / len(poly)
    else:
        avg_x, avg_y = 0, 0
    stalls = lot.get('stalls', [])
    types = set(s.get('stall_type') for s in stalls)
    print(f"{lot['id']} | {name:35} | Center: ({avg_x:5.0f}, {avg_y:5.0f}) | Stalls: {len(stalls):2} | Types: {types}")
