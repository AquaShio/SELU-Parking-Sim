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

sp = m['destinations'][0]['spawn']
cx, cy = sp['x'], sp['y']
size = 600

crop = Image.new('RGBA', (size, size), (50, 50, 50, 255))
min_wx = cx - size // 2
max_wx = cx + size // 2
min_wy = cy - size // 2
max_wy = cy + size // 2

min_tx = int(min_wx // 512) + ORIGIN_X
max_tx = int(max_wx // 512) + ORIGIN_X
min_ty = int(min_wy // 512) + ORIGIN_Y
max_ty = int(max_wy // 512) + ORIGIN_Y

for tx in range(min_tx, max_tx + 1):
    for ty in range(min_ty, max_ty + 1):
        p = TILES_DIR / f"19_{tx}_{ty}.webp"
        if p.exists():
            im = Image.open(p).convert('RGBA')
            dx = int((tx - ORIGIN_X) * 512 - min_wx)
            dy = int((ty - ORIGIN_Y) * 512 - min_wy)
            crop.paste(im, (dx, dy), im)

draw = ImageDraw.Draw(crop)

# Draw stalls from m['lots']
drawn_stalls = 0
for lot in m['lots']:
    for s in lot['stalls']:
        scx, scy = s['x'], s['y']
        if min_wx <= scx <= max_wx and min_wy <= scy <= max_wy:
            px_x = scx - min_wx
            px_y = scy - min_wy
            rad = math.radians(s['angle'])
            ca, sa = math.cos(rad), math.sin(rad)
            hl = s['height'] / 2.0
            hw = s['width'] / 2.0
            # Length is along ca, sa! Width is along -sa, ca!
            pts = [
                (px_x + du * ca - dv * sa, px_y + du * sa + dv * ca)
                for du, dv in [(-hl, -hw), (hl, -hw), (hl, hw), (-hl, hw)]
            ]
            draw.polygon(pts, outline=(0, 255, 120, 255), width=2)
            drawn_stalls += 1

# Draw trees from m['trees']
drawn_trees = 0
for t in m.get('trees', []):
    tx, ty = t['x'], t['y']
    if min_wx <= tx <= max_wx and min_wy <= ty <= max_wy:
        px_x = tx - min_wx
        px_y = ty - min_wy
        tr = t['radius']
        draw.ellipse([px_x - tr, px_y - tr, px_x + tr, px_y + tr], outline=(255, 220, 0, 255), width=2)
        drawn_trees += 1

crop.save(SCRATCH / 'visual_inspection_fayard.png')
print(f"Saved visual_inspection_fayard.png with {drawn_stalls} stalls and {drawn_trees} trees!")
