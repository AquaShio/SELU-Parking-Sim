import json

with open('backend/data/maps/selu_campus.json') as f:
    d = json.load(f)

# Find lots that share stalls
lots = d['lots']
duplicate_lot_ids = set()

# Map each stall coordinate to the lot that first claimed it
seen_coords = {}
lots_to_remove = set()

for lot in lots:
    lot_id = lot['id']
    stalls = lot.get('stalls', [])
    dup_count = 0
    for s in stalls:
        coord = (round(s['x'], 1), round(s['y'], 1))
        if coord in seen_coords:
            dup_count += 1
        else:
            seen_coords[coord] = lot_id
    if stalls and dup_count == len(stalls):
        print(f"Lot {lot_id} ({lot['name']}) is 100% duplicate ({dup_count}/{len(stalls)} stalls identical to earlier lots)!")
        lots_to_remove.add(lot_id)
    elif dup_count > 0:
        print(f"Lot {lot_id} ({lot['name']}) has {dup_count}/{len(stalls)} overlapping stalls.")

print(f"Identified {len(lots_to_remove)} 100% redundant duplicate lots to remove: {lots_to_remove}")
