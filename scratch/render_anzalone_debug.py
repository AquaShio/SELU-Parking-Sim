import json
from PIL import Image, ImageDraw

with open('backend/data/maps/selu_campus.json', encoding='utf-8') as f:
    d = json.load(f)

origin_x = d.get('tile_origin_x', 130375)
origin_y = d.get('tile_origin_y', 215420)

# East Anzalone & Fayard area: world x in [8900, 9600], world y in [9400, 10650]
# Let's stitch the z19 tiles covering this region
min_tx = int(8900 // 512) + origin_x
max_tx = int(9600 // 512) + origin_x
min_ty = int(9400 // 512) + origin_y
max_ty = int(10650 // 512) + origin_y

print(f"Tiles X: {min_tx}..{max_tx}, Y: {min_ty}..{max_ty}")

w = (max_tx - min_tx + 1) * 512
h = (max_ty - min_ty + 1) * 512
canvas = Image.new("RGB", (w, h))

for tx in range(min_tx, max_tx + 1):
    for ty in range(min_ty, max_ty + 1):
        p = f"backend/data/tiles/19_{tx}_{ty}.webp"
        try:
            im = Image.open(p).convert("RGB")
            canvas.paste(im, ((tx - min_tx) * 512, (ty - min_ty) * 512))
        except Exception as e:
            print("Missing tile:", p, e)

# Crop specifically to East Anzalone + North Fayard (world x: 9000..9550, world y: 9420..10150)
x0 = 9000 - (min_tx - origin_x) * 512
y0 = 9420 - (min_ty - origin_y) * 512
x1 = 9550 - (min_tx - origin_x) * 512
y1 = 10150 - (min_ty - origin_y) * 512

crop = canvas.crop((x0, y0, x1, y1))
crop.save("scratch/anzalone_fayard_raw.png")

# Also draw current stalls on top to compare
overlay = crop.copy()
draw = ImageDraw.Draw(overlay)
import math

for lot in d['lots']:
    if lot['id'] in ('lot_1148999', 'lot_1149000', 'lot_1179725'):
        for s in lot.get('stalls', []):
            cx = s['x'] - 9000
            cy = s['y'] - 9420
            if 0 <= cx <= 550 and 0 <= cy <= 730:
                ang = math.radians(s.get('angle', 0))
                hl = s.get('height', 32) / 2
                hw = s.get('width', 16) / 2
                cos_a, sin_a = math.cos(ang), math.sin(ang)
                pts = []
                for dx, dy in [(-hl, -hw), (hl, -hw), (hl, hw), (-hl, hw)]:
                    px = cx + dx * cos_a - dy * sin_a
                    py = cy + dx * sin_a + dy * cos_a
                    pts.append((px, py))
                color = (255, 200, 0) if lot['id'] == 'lot_1148999' else (255, 50, 50)
                draw.polygon(pts, outline=color)
                draw.ellipse((cx-2, cy-2, cx+2, cy+2), fill=color)

overlay.save("scratch/anzalone_fayard_current.png")
print("Saved scratch/anzalone_fayard_raw.png and scratch/anzalone_fayard_current.png")
