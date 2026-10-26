import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

SCRATCH = Path(r'C:\Users\imeli\.gemini\antigravity\brain\26fe171f-d5c4-4561-97bd-508195ced502\scratch')
TILES_DIR = Path(r'c:\Users\imeli\SELU-Parking-Sim\backend\data\tiles')
MAP_PATH = Path(r'c:\Users\imeli\SELU-Parking-Sim\backend\data\maps\selu_campus.json')

with open(MAP_PATH, 'r', encoding='utf-8') as f:
    m = json.load(f)

ORIGIN_X = m['tile_origin_x']
ORIGIN_Y = m['tile_origin_y']

def point_in_poly(x, y, poly):
    inside = False
    n = len(poly)
    p1x, p1y = poly[0]
    for i in range(1, n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

# Check lot_1148999
target_lot = next(l for l in m['lots'] if l['id'] == 'lot_1148999')
poly = target_lot['polygon']
min_x = int(min(p[0] for p in poly))
max_x = int(max(p[0] for p in poly))
min_y = int(min(p[1] for p in poly))
max_y = int(max(p[1] for p in poly))

w = max_x - min_x + 80
h = max_y - min_y + 80
lot_im = Image.new('RGBA', (w, h), (40, 40, 40, 255))

min_tx = int((min_x - 40) // 512) + ORIGIN_X
max_tx = int((max_x + 40) // 512) + ORIGIN_X
min_ty = int((min_y - 40) // 512) + ORIGIN_Y
max_ty = int((max_y + 40) // 512) + ORIGIN_Y

for tx in range(min_tx, max_tx + 1):
    for ty in range(min_ty, max_ty + 1):
        p = TILES_DIR / f"19_{tx}_{ty}.webp"
        if p.exists():
            t_im = Image.open(p).convert('RGBA')
            dx = int((tx - ORIGIN_X) * 512 - (min_x - 40))
            dy = int((ty - ORIGIN_Y) * 512 - (min_y - 40))
            lot_im.paste(t_im, (dx, dy), t_im)

px = lot_im.load()
line_pts = []
for ly in range(h):
    wy = min_y - 40 + ly
    for lx in range(w):
        wx = min_x - 40 + lx
        if not point_in_poly(wx, wy, poly):
            continue
        r, g, b, a = px[lx, ly]
        sat = max(r, g, b) - min(r, g, b)
        if 125 <= r <= 225 and sat <= 12:
            line_pts.append((wx, wy))

# Find best angle
best_deg = 0
best_sc = -1
for deg_i in range(0, 180):
    rad = math.radians(deg_i)
    cos_a, sin_a = math.cos(rad), math.sin(rad)
    hist = {}
    for x, y in line_pts:
        proj = int(round(-x * sin_a + y * cos_a))
        hist[proj] = hist.get(proj, 0) + 1
    top8 = sorted(hist.values(), reverse=True)[:8]
    sc = sum(c*c for c in top8)
    if sc > best_sc:
        best_sc = sc
        best_deg = deg_i

print(f"Dominant line angle inside lot polygon: {best_deg}°")

rad = math.radians(best_deg)
cos_a, sin_a = math.cos(rad), math.sin(rad)

# In this lot, let's look at the divider lines:
# Each divider line is a segment. Let's find each divider line by clustering:
v_hist = {}
for x, y in line_pts:
    v = -x * sin_a + y * cos_a
    vi = int(round(v))
    v_hist[vi] = v_hist.get(vi, 0) + 1

# Smooth v_hist
smoothed = {}
for vi, cnt in v_hist.items():
    smoothed[vi] = v_hist.get(vi-1, 0) + cnt + v_hist.get(vi+1, 0)

# Local maxima in v
peaks = []
for vi, cnt in smoothed.items():
    if cnt >= 25 and cnt > smoothed.get(vi-1, 0) and cnt >= smoothed.get(vi+1, 0):
        if all(abs(vi - p) >= 14 for p in peaks):
            peaks.append(vi)
peaks.sort()
print("Found peaks in v:", peaks)

# For each peak, gather points and find [u_min, u_max]
lines_info = []
for p in peaks:
    u_list = [x * cos_a + y * sin_a for x, y in line_pts if abs((-x * sin_a + y * cos_a) - p) <= 2.5]
    if len(u_list) >= 15:
        u_list.sort()
        u1 = u_list[int(len(u_list) * 0.05)]
        u2 = u_list[int(len(u_list) * 0.95)]
        if u2 - u1 >= 25:
            lines_info.append((p, u1, u2))

print(f"Found {len(lines_info)} distinct painted lines")

# Pair adjacent parallel lines into parking stalls
stalls = []
for i in range(len(lines_info) - 1):
    pA, uA1, uA2 = lines_info[i]
    pB, uB1, uB2 = lines_info[i+1]
    sep = pB - pA
    if 15 <= sep <= 26:
        # Check overlap in u
        ov_min = max(uA1, uB1)
        ov_max = min(uA2, uB2)
        if ov_max - ov_min >= 24:
            u_mid = (ov_min + ov_max) / 2.0
            v_mid = (pA + pB) / 2.0
            swx = u_mid * cos_a - v_mid * sin_a
            swy = u_mid * sin_a + v_mid * cos_a
            stalls.append({
                'wx': swx,
                'wy': swy,
                'length': ov_max - ov_min,
                'width': sep - 1.5,
                'angle': best_deg
            })

print(f"Extracted {len(stalls)} stalls!")

draw = ImageDraw.Draw(lot_im)
for st in stalls:
    slx = st['wx'] - (min_x - 40)
    sly = st['wy'] - (min_y - 40)
    rad = math.radians(st['angle'])
    ca, sa = math.cos(rad), math.sin(rad)
    hl = st['length'] / 2.0
    hw = st['width'] / 2.0
    pts = [
        (slx + du * ca - dv * sa, sly + du * sa + dv * ca)
        for du, dv in [(-hl, -hw), (hl, -hw), (hl, hw), (-hl, hw)]
    ]
    draw.polygon(pts, outline=(0, 255, 100, 255), width=2)

lot_im.save(SCRATCH / 'lot_stalls_test.png')
print("Saved lot_stalls_test.png")
