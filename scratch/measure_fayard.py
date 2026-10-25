from PIL import Image, ImageDraw

im = Image.open("scratch/full_fayard_anzalone_before.png")
# full_fayard_anzalone_before.png has origin (9050, 9420), size (500, 1220)
# Let's make a raw crop from the tiles with a 50px coordinate grid so we can read off every row of Fayard Hall Lot
import json

with open('backend/data/maps/selu_campus.json', encoding='utf-8') as f:
    d = json.load(f)

origin_x = d.get('tile_origin_x', 130375)
origin_y = d.get('tile_origin_y', 215420)
min_tx = int(8900 // 512) + origin_x
max_tx = int(9600 // 512) + origin_x
min_ty = int(9400 // 512) + origin_y
max_ty = int(10650 // 512) + origin_y

canvas = Image.new("RGB", ((max_tx - min_tx + 1) * 512, (max_ty - min_ty + 1) * 512))
for tx in range(min_tx, max_tx + 1):
    for ty in range(min_ty, max_ty + 1):
        p = f"backend/data/tiles/19_{tx}_{ty}.webp"
        canvas.paste(Image.open(p).convert("RGB"), ((tx - min_tx) * 512, (ty - min_ty) * 512))

crop = canvas.crop((9100 - (min_tx - origin_x) * 512, 9800 - (min_ty - origin_y) * 512, 9520 - (min_tx - origin_x) * 512, 10630 - (min_ty - origin_y) * 512))
draw = ImageDraw.Draw(crop)
for wx in range(9100, 9520, 40):
    px = wx - 9100
    draw.line([(px, 0), (px, 830)], fill=(0, 255, 255), width=1)
    draw.text((px + 2, 5), str(wx), fill=(0, 255, 255))
for wy in range(9800, 10630, 40):
    py = wy - 9800
    draw.line([(0, py), (420, py)], fill=(0, 255, 255), width=1)
    draw.text((5, py + 2), str(wy), fill=(0, 255, 255))

crop.save("scratch/fayard_ruler.png")
print("Saved scratch/fayard_ruler.png")
