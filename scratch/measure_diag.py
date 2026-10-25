from PIL import Image, ImageDraw
import math

im = Image.open("scratch/anzalone_fayard_raw.png")
# anzalone_fayard_raw.png has origin (9000, 9420)
# Let's test overlaying 10 west and 10 east diagonal stalls and check against the white lines!
# Let's inspect pixel coordinates where brightness > 180 in the diagonal region (x: 9250..9400, y: 9480..9760)
w, h = im.size
pts = []
for wy in range(9480, 9760, 2):
    for wx in range(9250, 9400, 2):
        r, g, b = im.getpixel((wx - 9000, wy - 9420))
        if r > 175 and g > 175 and b > 175:
            pts.append((wx, wy))

print(f"Found {len(pts)} bright line pixels in diagonal zone")
# Find bounding box of bright pixels
min_x = min(p[0] for p in pts)
max_x = max(p[0] for p in pts)
min_y = min(p[1] for p in pts)
max_y = max(p[1] for p in pts)
print(f"Diagonal island white lines bbox: X=[{min_x}..{max_x}], Y=[{min_y}..{max_y}]")

# Let's draw a ruler grid on the diagonal zone to read off exact coordinates
ruler = im.crop((9230 - 9000, 9470 - 9420, 9420 - 9000, 9770 - 9420)).resize((380, 600), Image.NEAREST)
draw = ImageDraw.Draw(ruler)
for wx in range(9240, 9420, 20):
    px = (wx - 9230) * 2
    draw.line([(px, 0), (px, 600)], fill=(0, 255, 255), width=1)
    draw.text((px + 2, 5), str(wx), fill=(0, 255, 255))
for wy in range(9480, 9770, 20):
    py = (wy - 9470) * 2
    draw.line([(0, py), (380, py)], fill=(0, 255, 255), width=1)
    draw.text((5, py + 2), str(wy), fill=(0, 255, 255))

ruler.save("scratch/diag_ruler.png")
print("Saved scratch/diag_ruler.png")
