import json

with open('backend/data/maps/selu_campus.json', encoding='utf-8') as f:
    data = json.load(f)

lots = data.get('lots', [])
print(f"Total lots: {len(lots)}")
for lot in lots:
    lot_id = lot.get('id', '')
    name = lot.get('name', '')
    permit = lot.get('permit_type', '')
    stalls = lot.get('stalls', [])
    stall_types = {}
    for s in stalls:
        st = s.get('stall_type', 'unknown')
        stall_types[st] = stall_types.get(st, 0) + 1
    print(f"[{lot_id}] {name} -> lot_permit: {permit} | stalls ({len(stalls)}): {stall_types}")
