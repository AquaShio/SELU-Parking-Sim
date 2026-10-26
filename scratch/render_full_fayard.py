import json
from PIL import Image, ImageDraw

with open('backend/data/maps/selu_campus.json', encoding='utf-8') as f:
    d = json.load(f)

origin_x = d.get('tile_origin_x', 130375)
origin_y = d.get('tile_origin_y', 215420)

min_tx = int(8900 // 512) + origin_x
max_tx = int(9600 // 512) + origin_x
min_ty = int(9400 // 512) + origin_y
max_ty = int(10650 // 512) + origin_y

w = (max_tx - min_tx + 1) * 512
h = (max_ty - min_ty + 1) * 512
canvas = Image.new("RGB", (w, h))

for tx in range(min_tx, max_tx + 1):
    for ty in range(min_ty, max_ty + 1):
        p = f"backend/data/tiles/19_{tx}_{ty}.webp"
        im = Image.open(p).convert("RGB")
        canvas.paste(im, ((tx - min_tx) * 512, (ty - min_ty) * 512))

x0 = 9050 - (min_tx - origin_x) * 512
y0 = 9420 - (min_ty - origin_y) * 512
x1 = 9550 - (min_tx - origin_x) * 512
y1 = 10640 - (min_ty - origin_y) * 512

crop = canvas.crop((x0, y0, x1, y1))
draw = ImageDraw.Draw(crop)

# Draw current stalls on full Fayard + Anzalone
import math
for lot in d['lots']:
    if lot['id'] in ('lot_1148999', 'lot_1149000', 'lot_1179725'):
        for s in lot.get('stalls', []):
            cx = s['x'] - 9050
            cy = s['y'] - 9420
            ang = math.radians(s.get('angle', 0))
            hl = s.get('height', 32) / 2
            hw = s.get('width', 16) / 2
            cos_a, sin_a = math.cos(ang), math.sin(ang)
            pts = []
            for dx, dy in [(-hl, -hw), (hl, -hw), (hl, hw), (-hl, hw)]:
                px = cx + dx * cos_a - dy * sin_a
                py = cy + dx * sin_a + dy * cos_a
                pts.append((px, py))
            color = (255, 215, 0) if lot['id'] == 'lot_1148999' else (255, 60, 60)
            draw.polygon(pts, outline=color)
            draw.ellipse((cx-2, cy-2, cx+2, cy+2), fill=color)

crop.save("scratch/full_fayard_anzalone_before.png")
print("Saved scratch/full_fayard_anzalone_before.png")
