import json
import math

with open('backend/data/maps/selu_campus.json', encoding='utf-8') as f:
    d = json.load(f)

total_added = 0

for lot in d['lots']:
    if lot['id'] in ('lot_1148999', 'lot_1149000', 'lot_1179725'):
        # Already hand-verified to 100% precision
        continue
    stalls = lot.get('stalls', [])
    if len(stalls) < 2:
        continue

    # Group stalls into rows: two stalls belong to the same row if their angle is within 8 deg
    # and the vector between them is roughly perpendicular to their stall longitudinal angle (within 18 deg)
    # and their distance is < 110 px.
    existing_coords = [(s['x'], s['y']) for s in stalls]
    new_stalls = []
    next_id = len(stalls) + 1

    # For each stall, find its nearest neighbor in the "positive perpendicular" direction along the row
    for s1 in stalls:
        ang1 = s1.get('angle', 0.0)
        # Perpendicular direction to stall angle (along the row of stalls)
        perp_rad = math.radians(ang1 + 90.0)
        px_dir = math.cos(perp_rad)
        py_dir = math.sin(perp_rad)

        best_s2 = None
        best_dist = 999.0

        for s2 in stalls:
            if s1['id'] == s2['id']:
                continue
            # Check angle similarity
            ang_diff = abs((s1.get('angle', 0) - s2.get('angle', 0) + 180) % 360 - 180)
            if ang_diff > 8.0:
                continue

            dx = s2['x'] - s1['x']
            dy = s2['y'] - s1['y']
            dist = math.hypot(dx, dy)
            if dist < 15.0 or dist > 92.0:
                continue

            # Project onto perpendicular (row) axis and longitudinal (stall length) axis
            along_row = dx * px_dir + dy * py_dir
            along_len = abs(dx * (-py_dir) + dy * px_dir)

            if along_row > 14.0 and along_len < 7.5:
                if along_row < best_dist:
                    best_dist = along_row
                    best_s2 = s2

        if best_s2 is not None:
            avg_w = (s1.get('width', 21.0) + best_s2.get('width', 21.0)) / 2.0
            ratio = best_dist / max(18.0, avg_w)
            num_missing = round(ratio) - 1
            if 1 <= num_missing <= 3 and abs(ratio - round(ratio)) < 0.25:
                for m in range(1, num_missing + 1):
                    frac = m / (num_missing + 1)
                    mx = round(s1['x'] + (best_s2['x'] - s1['x']) * frac, 1)
                    my = round(s1['y'] + (best_s2['y'] - s1['y']) * frac, 1)
                    # Check not colliding with any existing or newly added stall
                    if all(math.hypot(mx - ex, my - ey) > 13.0 for ex, ey in existing_coords):
                        existing_coords.append((mx, my))
                        new_stalls.append({
                            "id": f"{lot['id']}_fill_{next_id:03d}",
                            "lot_id": lot['id'],
                            "x": mx,
                            "y": my,
                            "width": round(avg_w, 1),
                            "height": round((s1.get('height', 40.0) + best_s2.get('height', 40.0)) / 2.0, 1),
                            "angle": round(s1.get('angle', 0.0), 1),
                            "stall_type": s1.get('stall_type', lot.get('permit_type') or 'upperclass')
                        })
                        next_id += 1

    if new_stalls:
        print(f"[{lot['id']}] {lot['name']}: filled {len(new_stalls)} missing stalls in rows (was {len(stalls)} -> {len(stalls) + len(new_stalls)})")
        lot['stalls'].extend(new_stalls)
        total_added += len(new_stalls)

with open('backend/data/maps/selu_campus.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, indent=2)

print(f"Total missing stalls filled across all campus lots: {total_added}")
