from PIL import Image

img = Image.open('scratch/anzalone_area.png').convert('RGB')
w, h = img.size
# Crop covers World X: 8800..9600 (x in [0, 800]), World Y: 9400..10100 (y in [0, 700])
# WorldX = x + 8800, WorldY = y + 9400

pixels = img.load()

# Let's find clusters of bright white paint pixels (r > 200, sat < 20) on asphalt
white_pixels = []
for y in range(h):
    for x in range(w):
        r, g, b = pixels[x, y]
        sat = max(r, g, b) - min(r, g, b)
        if r > 190 and sat < 20:
            white_pixels.append((x, y))

print(f"Total white paint pixels in Anzalone area: {len(white_pixels)}")

# Let's inspect where the diagonal stripes are in the middle (x: 400..650, y: 150..450)
mid_stripes = [p for p in white_pixels if 400 <= p[0] <= 650 and 150 <= p[1] <= 450]
print(f"White paint pixels in middle lot: {len(mid_stripes)}")
if mid_stripes:
    xs = [p[0] for p in mid_stripes]
    ys = [p[1] for p in mid_stripes]
    print(f"Middle lot bounds: x=[{min(xs)+8800}, {max(xs)+8800}], y=[{min(ys)+9400}, {max(ys)+9400}]")
