import json

with open('backend/data/maps/selu_campus.json') as f:
    d = json.load(f)

for lot in d['lots']:
    if lot['id'] in ['lot_1148999', 'lot_1148901']:
        print(f"=== {lot['id']} ({lot['name']}) ===")
        for s in lot['stalls']:
            print(f"  ({s['x']:.1f}, {s['y']:.1f}), w={s['width']}, h={s['height']}, angle={s['angle']:.1f}, type={s['stall_type']}")
