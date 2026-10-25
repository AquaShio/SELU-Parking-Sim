import json

with open('backend/data/maps/selu_campus.json', encoding='utf-8') as f:
    d = json.load(f)

for lot_id in ('lot_1148999', 'lot_1149000', 'lot_1179725'):
    for lot in d['lots']:
        if lot['id'] == lot_id:
            print(f"=== {lot_id}: {lot['name']} ({len(lot['stalls'])} stalls) ===")
            for s in sorted(lot['stalls'], key=lambda x: (round(x['y']/40), x['x'])):
                print(f"  {s['id']}: x={s['x']:.1f}, y={s['y']:.1f}, w={s['width']}, h={s['height']}, ang={s['angle']}")
