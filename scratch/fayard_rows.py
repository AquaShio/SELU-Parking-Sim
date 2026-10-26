import json

with open('backend/data/maps/selu_campus.json', encoding='utf-8') as f:
    d = json.load(f)

for lot in d['lots']:
    if lot['id'] == 'lot_1149000':
        stalls = lot['stalls']
        print(f"Total Fayard stalls: {len(stalls)}")
        # Sort by x coordinate
        stalls_by_x = sorted(stalls, key=lambda s: s['x'])
        print("X range:", stalls_by_x[0]['x'], "to", stalls_by_x[-1]['x'])
        for s in stalls_by_x:
            print(f"  {s['id']}: x={s['x']:.1f}, y={s['y']:.1f}")
