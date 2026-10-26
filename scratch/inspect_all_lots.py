import json

with open('backend/data/maps/selu_campus.json') as f:
    d = json.load(f)

print(f"{'Lot ID':<16} {'Lot Name':<42} {'Stalls':<8} {'Current Stalls Type'}")
print("-" * 90)
for lot in d['lots']:
    stalls = lot.get('stalls', [])
    types = set(s.get('stall_type') for s in stalls)
    types_str = ", ".join(types) if types else "empty"
    print(f"{lot['id']:<16} {lot['name']:<42} {len(stalls):<8} {types_str}")
