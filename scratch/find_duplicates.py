import json
from collections import defaultdict

with open('backend/data/maps/selu_campus.json') as f:
    d = json.load(f)

# Group stalls by approximate coordinate
stall_coord_map = defaultdict(list)
for lot in d['lots']:
    for s in lot.get('stalls', []):
        key = (round(s['x'], 1), round(s['y'], 1))
        stall_coord_map[key].append((lot['id'], lot['name'], s['id'], s['stall_type']))

duplicates = {k: v for k, v in stall_coord_map.items() if len(v) > 1}
print(f"Total distinct stall coordinates: {len(stall_coord_map)}")
print(f"Coordinates with duplicate/overlapping stalls: {len(duplicates)}")
sample = list(duplicates.items())[:5]
for coord, instances in sample:
    print(f"At {coord}:")
    for inst in instances:
        print(f"   lot: {inst[0]} ({inst[1]}), stall: {inst[2]}, type: {inst[3]}")
