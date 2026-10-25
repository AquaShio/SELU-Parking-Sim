import json

with open('backend/data/maps/selu_campus.json', encoding='utf-8') as f:
    d = json.load(f)

anzalone_stalls = []
idx = 1

# Row A: West Curb Row (6 stalls along Anzalone Hall grass)
for i in range(6):
    anzalone_stalls.append({
        "id": f"lot_1148999_s{idx:03d}",
        "lot_id": "lot_1148999",
        "x": round(9198.2 + i * 2.55, 1),
        "y": round(9538.5 + i * 21.3, 1),
        "width": 20.5,
        "height": 40.0,
        "angle": 356.3,
        "stall_type": "upperclass"
    })
    idx += 1

# Row B: Center Diagonal West Column (12 stalls, exact fit between white lines)
for i in range(12):
    anzalone_stalls.append({
        "id": f"lot_1148999_s{idx:03d}",
        "lot_id": "lot_1148999",
        "x": round(9299.5 + i * 2.85, 1),
        "y": round(9529.8 + i * 20.25, 1),
        "width": 18.2,
        "height": 39.0,
        "angle": 18.8,
        "stall_type": "upperclass"
    })
    idx += 1

# Row C: Center Diagonal East Column (12 stalls, exact fit between white lines)
for i in range(12):
    anzalone_stalls.append({
        "id": f"lot_1148999_s{idx:03d}",
        "lot_id": "lot_1148999",
        "x": round(9341.0 + i * 2.85, 1),
        "y": round(9527.5 + i * 20.25, 1),
        "width": 18.2,
        "height": 39.0,
        "angle": 18.8,
        "stall_type": "upperclass"
    })
    idx += 1

# Row D: East Sidewalk Vertical Column (11 stalls in Anzalone upper section)
for i in range(11):
    anzalone_stalls.append({
        "id": f"lot_1148999_s{idx:03d}",
        "lot_id": "lot_1148999",
        "x": round(9471.5 - i * 0.18, 1),
        "y": round(9524.0 + i * 21.1, 1),
        "width": 20.2,
        "height": 41.0,
        "angle": 0.0,
        "stall_type": "upperclass"
    })
    idx += 1


fayard_stalls = []
f_idx = 1

# East Sidewalk Vertical Column continuation (6 stalls in Fayard north-east section)
for i in range(6):
    fayard_stalls.append({
        "id": f"lot_1149000_s{f_idx:03d}",
        "lot_id": "lot_1149000",
        "x": round(9466.0 - i * 0.2, 1),
        "y": round(9758.5 + i * 20.9, 1),
        "width": 20.0,
        "height": 40.0,
        "angle": 0.0,
        "stall_type": "faculty"
    })
    f_idx += 1

# Row 1: North of 1st grass island (9 stalls)
for i in range(9):
    fayard_stalls.append({
        "id": f"lot_1149000_s{f_idx:03d}",
        "lot_id": "lot_1149000",
        "x": round(9169.5 + i * 20.47, 1),
        "y": round(9902.0 - i * 5.58, 1),
        "width": 20.0,
        "height": 42.0,
        "angle": 74.5,
        "stall_type": "faculty"
    })
    f_idx += 1

# Row 2: South of 1st grass island (9 stalls; first 2 are Parkmobile visitor in lot_1179725, next 7 are faculty)
parkmobile_fayard_stalls = []
for i in range(9):
    sx = round(9169.0 + i * 20.43, 1)
    sy = round(9979.6 - i * 5.58, 1)
    if i < 2:
        parkmobile_fayard_stalls.append({
            "id": f"lot_1179725_s{i+1:03d}",
            "lot_id": "lot_1179725",
            "x": sx,
            "y": sy,
            "width": 20.0,
            "height": 40.5,
            "angle": 74.5,
            "stall_type": "visitor"
        })
    else:
        fayard_stalls.append({
            "id": f"lot_1149000_s{f_idx:03d}",
            "lot_id": "lot_1149000",
            "x": sx,
            "y": sy,
            "width": 20.0,
            "height": 40.5,
            "angle": 74.5,
            "stall_type": "faculty"
        })
        f_idx += 1

# Row 3: North of 2nd grass island (9 stalls)
for i in range(9):
    fayard_stalls.append({
        "id": f"lot_1149000_s{f_idx:03d}",
        "lot_id": "lot_1149000",
        "x": round(9192.0 + i * 20.45, 1),
        "y": round(10067.0 - i * 5.58, 1),
        "width": 20.0,
        "height": 42.5,
        "angle": 74.5,
        "stall_type": "faculty"
    })
    f_idx += 1

# Row 4: South of 2nd grass island (9 stalls)
for i in range(9):
    fayard_stalls.append({
        "id": f"lot_1149000_s{f_idx:03d}",
        "lot_id": "lot_1149000",
        "x": round(9212.1 + i * 20.42, 1),
        "y": round(10139.1 - i * 5.58, 1),
        "width": 20.0,
        "height": 39.5,
        "angle": 74.5,
        "stall_type": "faculty"
    })
    f_idx += 1

# Row 5: North of central tree-lined walkway (13 stalls, shifted up cleanly onto the white lines)
for i in range(13):
    fayard_stalls.append({
        "id": f"lot_1149000_s{f_idx:03d}",
        "lot_id": "lot_1149000",
        "x": round(9213.0 + i * 20.45, 1),
        "y": round(10243.0 - i * 5.55, 1),
        "width": 20.0,
        "height": 36.0,
        "angle": 74.8,
        "stall_type": "faculty"
    })
    f_idx += 1

# Row 6: South of central tree-lined walkway (13 stalls)
for i in range(13):
    fayard_stalls.append({
        "id": f"lot_1149000_s{f_idx:03d}",
        "lot_id": "lot_1149000",
        "x": round(9215.9 + i * 21.44, 1),
        "y": round(10350.7 - i * 5.31, 1),
        "width": 20.5,
        "height": 36.0,
        "angle": 74.9,
        "stall_type": "faculty"
    })
    f_idx += 1

# Row 7: North of 3rd grass island (8 stalls)
for i in range(8):
    fayard_stalls.append({
        "id": f"lot_1149000_s{f_idx:03d}",
        "lot_id": "lot_1149000",
        "x": round(9288.0 + i * 20.57, 1),
        "y": round(10427.5 - i * 5.78, 1),
        "width": 20.0,
        "height": 40.5,
        "angle": 76.8,
        "stall_type": "faculty"
    })
    f_idx += 1

# Row 8: South of 3rd grass island (8 stalls)
for i in range(8):
    fayard_stalls.append({
        "id": f"lot_1149000_s{f_idx:03d}",
        "lot_id": "lot_1149000",
        "x": round(9304.5 + i * 20.54, 1),
        "y": round(10498.2 - i * 5.94, 1),
        "width": 20.0,
        "height": 37.5,
        "angle": 76.8,
        "stall_type": "faculty"
    })
    f_idx += 1

# Row 9: South boundary wall (9 stalls)
for i in range(9):
    fayard_stalls.append({
        "id": f"lot_1149000_s{f_idx:03d}",
        "lot_id": "lot_1149000",
        "x": round(9305.0 + i * 21.0, 1),
        "y": round(10590.5 - i * 5.7, 1),
        "width": 20.2,
        "height": 40.5,
        "angle": 74.2,
        "stall_type": "faculty"
    })
    f_idx += 1

for lot in d['lots']:
    if lot['id'] == 'lot_1148999':
        lot['stalls'] = anzalone_stalls
    elif lot['id'] == 'lot_1149000':
        lot['stalls'] = fayard_stalls
    elif lot['id'] == 'lot_1179725':
        lot['stalls'] = parkmobile_fayard_stalls

with open('backend/data/maps/selu_campus.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, indent=2)

print("Saved refined Fayard & Anzalone stalls")
