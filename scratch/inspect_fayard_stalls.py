import json

with open('backend/data/maps/selu_campus.json', encoding='utf-8') as f:
    d = json.load(f)

for lot in d.get('lots', []):
    if lot['id'] in ('lot_1149000', 'lot_1148999'):
        print(f"\n--- {lot['id']} ({lot['name']}) ---")
        stalls = lot.get('stalls', [])
        for s in stalls[:10]:
            print(f"Stall {s['id']}: ({s['x']:.1f}, {s['y']:.1f}), angle: {s.get('angle', 0):.1f}, type: {s.get('stall_type')}")
        print(f"... total {len(stalls)} stalls")
