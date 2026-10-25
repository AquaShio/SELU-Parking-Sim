import json
with open('backend/data/maps/selu_campus.json') as f:
    d = json.load(f)

fayard_target_ids = ['lot_1149000', 'lot_1179725', 'lot_1149020', 'lot_1148999', 'lot_1179724', 'lot_1148902', 'lot_1179726', 'lot_1148901']
for lot in d['lots']:
    if lot['id'] in fayard_target_ids:
        stalls = lot.get('stalls', [])
        types = set(s.get('stall_type') for s in stalls)
        print(f"{lot['id']} ({lot['name']}): stalls={len(stalls)}, types={types}")
