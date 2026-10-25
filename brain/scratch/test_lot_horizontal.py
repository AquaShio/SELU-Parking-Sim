import math
import json
from pathlib import Path
from PIL import Image, ImageDraw

SCRATCH = Path(r'C:\Users\imeli\SELU-Parking-Sim\brain\scratch' if False else r'C:\Users\imeli\.gemini\antigravity\brain\26fe171f-d5c4-4561-97bd-508195ced502\scratch')
TILES_DIR = Path(r'c:\Users\imeli\SELU-Parking-Sim\backend\data\tiles')
MAP_PATH = Path(r'c:\Users\imeli\SELU-Parking-Sim\backend\data\maps\selu_campus.json')

with open(MAP_PATH, 'r', encoding='utf-8') as f:
    m = json.load(f)

ORIGIN_X = m['tile_origin_x']
ORIGIN_Y = m['tile_origin_y']

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

# Test 1: Right row along sidewalk (x: 270 to 320 in lot_im coordinates)
# The lines here are horizontal (angle = 0 or 180, i.e. parallel to X axis)
# Let's find horizontal line segments:
lines_right = []
for ly in range(30, h - 30):
    # Check if a horizontal segment of white pixels exists
    white_run = 0
    start_x = None
    for lx in range(250, min(w - 10, 340)):
        r, g, b, a = px[lx, ly]
        sat = max(r, g, b) - min(r, g, b)
        if 135 <= r <= 225 and sat <= 12:
            if start_x is None: start_x = lx
            white_run += 1
        else:
            if white_run >= 20:
                lines_right.append((ly, start_x, start_x + white_run))
            white_run = 0
            start_x = None

print(f"Detected {len(lines_right)} raw line segments on right")

# Group lines by y proximity
distinct_lines = []
for ly, x1, x2 in lines_right:
    if not any(abs(ly - dl[0]) <= 5 for dl in distinct_lines):
        distinct_lines.append((ly, x1, x2))
distinct_lines.sort()
print(f"Distinct lines on right: {len(distinct_lines)}")

# Pair into stalls:
stalls_right = []
for i in range(len(distinct_lines) - 1):
    l1 = distinct_lines[i]
    l2 = distinct_lines[i+1]
    dy = l2[0] - l1[0]
    if 15 <= dy <= 26:
        # stall center:
        scx = (max(l1[1], l2[1]) + min(l1[2], l2[2])) / 2.0
        scy = (l1[0] + l2[0]) / 2.0
        sw = min(l1[2], l2[2]) - max(l1[1], l2[1])
        stalls_right.append((scx, scy, sw, dy))

draw = ImageDraw.Draw(lot_im)
for scx, scy, sw, sh in stalls_right:
    # A horizontal stall has width along X (~36px) and height along Y (~19px)!
    draw.rectangle([scx - sw/2, scy - sh/2, scx + sw/2, scy + sh/2], outline=(255, 255, 0, 255), width=2)

lot_im.save(SCRATCH / 'lot_horizontal_test.png')
print("Saved lot_horizontal_test.png")
