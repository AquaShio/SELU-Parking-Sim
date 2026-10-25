import json
with open('backend/data/maps/selu_campus.json') as f:
    d = json.load(f)

for dest in d.get('destinations', []):
    print("=" * 60)
    print(f"Destination: {dest['id']} - {dest['name']}")
    target_ids = dest.get('target_lot_ids', [])
    for lot in d['lots']:
        if lot['id'] in target_ids:
            stalls = lot.get('stalls', [])
            types = {}
            for s in stalls:
                t = s.get('stall_type', 'unknown')
                types[t] = types.get(t, 0) + 1
            print(f"  {lot['id']} ({lot['name']}): stalls={len(stalls)} -> {types}")
