import json

with open('backend/data/maps/selu_campus.json') as f:
    d = json.load(f)

anzalone_stalls = []
for lot in d['lots']:
    for s in lot.get('stalls', []):
        if 8500 <= s['x'] <= 9200 and 9400 <= s['y'] <= 10100:
            anzalone_stalls.append((lot['id'], lot['name'], s))

print(f"Total stalls near Anzalone: {len(anzalone_stalls)}")
by_lot = {}
for lot_id, lot_name, s in anzalone_stalls:
    by_lot[lot_id] = by_lot.get(lot_id, 0) + 1

for lid, count in by_lot.items():
    print(f"  {lid}: {count} stalls")
