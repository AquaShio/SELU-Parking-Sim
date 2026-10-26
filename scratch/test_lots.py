import json

with open('backend/data/maps/selu_campus.json') as f:
    d = json.load(f)

print(f"Total lots: {len(d['lots'])}")
for lot in d['lots']:
    stalls = lot.get('stalls', [])
    types = {}
    for s in stalls:
        t = s.get('stall_type', 'unknown')
        types[t] = types.get(t, 0) + 1
    print(f"Lot {lot['id']} - {lot['name']} (allowed: {lot.get('allowed_permits')}): {len(stalls)} stalls -> {types}")
