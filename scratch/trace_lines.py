from PIL import Image

img = Image.open('scratch/anzalone_area.png').convert('RGB')
pixels = img.load()

# World coordinates: x_world = x_local + 8800, y_world = y_local + 9400
# Let's inspect white lines in x_local in 400..650 (x_world in 9200..9450), y_local in 160..430 (y_world in 9560..9830)
lines = []
for y in range(160, 430, 5):
    row_white = [x for x in range(400, 650) if pixels[x, y][0] > 190 and max(pixels[x, y]) - min(pixels[x, y]) < 20]
    if row_white:
        lines.append((y + 9400, [x + 8800 for x in row_white]))

print(f"Found {len(lines)} rows with white line points:")
for y_w, xs_w in lines[::5]:
    print(f"  y={y_w}: x in {xs_w}")
