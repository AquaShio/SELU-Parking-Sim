import json

with open('backend/data/maps/selu_campus.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

# 1. Duplicate lot IDs to eliminate completely
duplicate_lot_ids = {
    'lot_1180011',  # duplicate of North Cefalu
    'lot_1180012',  # duplicate of North Cefalu
    'lot_1148927',  # duplicate of North Union Lot
    'lot_1179835',  # duplicate of Ascension Lot
    'lot_1149295',  # duplicate of North Oaks Park Lot
    'lot_1149296',  # duplicate of Text Book Rental Lot
}

filtered_lots = []
seen_stall_coords = set()
total_stalls_before = sum(len(l.get('stalls', [])) for l in d['lots'])

for lot in d['lots']:
    if lot['id'] in duplicate_lot_ids:
        continue
    
    unique_stalls = []
    for s in lot.get('stalls', []):
        coord = (round(s['x'], 1), round(s['y'], 1))
        if coord in seen_stall_coords:
            continue
        seen_stall_coords.add(coord)
        unique_stalls.append(s)
    
    lot['stalls'] = unique_stalls
    filtered_lots.append(lot)

d['lots'] = filtered_lots
total_stalls_after = sum(len(l.get('stalls', [])) for l in d['lots'])
print(f"Lots before: {len(d['lots']) + len(duplicate_lot_ids)}, Lots after: {len(d['lots'])}")
print(f"Stalls before: {total_stalls_before}, Stalls after: {total_stalls_after}")

# 2. Correctly zone Fayard Hall, Mane Street, and East D Vickers
for lot in d['lots']:
    if lot['id'] == 'lot_1149000':  # Fayard Hall Lot
        # Reserve front row (12 stalls) for Faculty, rest 43 stalls for Upperclass Commuter
        stalls = lot.get('stalls', [])
        for i, s in enumerate(stalls):
            if i < 12:
                s['stall_type'] = 'faculty'
            else:
                s['stall_type'] = 'upperclass'
        print(f"Re-zoned Fayard Hall Lot: 12 faculty, {len(stalls) - 12} upperclass")
    
    elif lot['id'] == 'lot_1148901':  # Mane Street
        # 10 faculty, rest upperclass
        stalls = lot.get('stalls', [])
        for i, s in enumerate(stalls):
            if i < 10:
                s['stall_type'] = 'faculty'
            else:
                s['stall_type'] = 'upperclass'
        print(f"Re-zoned Mane Street Lot: 10 faculty, {len(stalls) - 10} upperclass")
        
    elif lot['id'] == 'lot_1148902':  # East D Vickers
        stalls = lot.get('stalls', [])
        for i, s in enumerate(stalls):
            if i < 6:
                s['stall_type'] = 'faculty'
            else:
                s['stall_type'] = 'upperclass'
        print(f"Re-zoned East D Vickers: 6 faculty, {len(stalls) - 6} upperclass")

# 3. Update destination target lot IDs to include all authentic commuter and faculty lots
for dest in d.get('destinations', []):
    if dest['id'] == 'dest_fayard':
        dest['target_lot_ids'] = [
            'lot_1149000',  # Fayard Hall Lot (upperclass + faculty)
            'lot_1148999',  # East Anzalone Lot (upperclass)
            'lot_1148901',  # Mane Street (upperclass + faculty)
            'lot_1148898',  # North Oak East Lot (upperclass)
            'lot_1148902',  # East D Vickers (upperclass + faculty)
            'lot_1179725',  # Parkmobile Fayard
        ]
    elif dest['id'] == 'dest_union':
        dest['target_lot_ids'] = [
            'lot_1148957',  # South Union Lot (100 commuter stalls!)
            'lot_1148919',  # Union Avenue (78 commuter stalls!)
            'lot_1148911',  # North General Pershing (38 commuter stalls!)
            'lot_1148929',  # F/S North Union Lot (35 faculty stalls)
            'lot_1148955',  # Student Union Inner Circle (faculty)
            'lot_1148956',  # Student Union Outer Circle (faculty)
            'lot_1149020',  # East Student Union Lot (faculty)
            'lot_1179724',  # Parkmobile E Student Union
            'lot_1179727',  # Parkmobile Student Union Circle
            'lot_1179728',  # Parkmobile South Union
        ]
    elif dest['id'] == 'dest_uc_game':
        dest['target_lot_ids'] = [
            'lot_1148821',  # Driving Range Lot (freshman)
            'lot_1148822',  # University Center Lot (freshman)
            'lot_1148832',  # University Center Gate 7 (freshman)
            'lot_1148833',  # University Center Gate 4 (freshman)
            'lot_1148834',  # University Center Gate 3 (freshman)
            'lot_1148844',  # Cook Field Lot (freshman)
            'lot_1148839',  # University Center Gate 1 (faculty)
            'lot_1148837',  # N Campus Main Building B (faculty)
        ]
    elif dest['id'] == 'dest_oaks':
        dest['target_lot_ids'] = [
            'lot_1148888',  # Southeastern Oaks / Greek Village (resident)
            'lot_1148830',  # Textbook Rental Lot (freshman / commuter)
            'lot_1148838',  # Lion Lane @ Bld B (faculty)
            'lot_1148831',  # North Oaks Park Lot (freshman / commuter)
        ]

with open('backend/data/maps/selu_campus.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, indent=2)

print("Saved cleaned & correctly-zoned selu_campus.json!")
