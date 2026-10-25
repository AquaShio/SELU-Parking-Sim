from PIL import Image

img = Image.open('scratch/anzalone_area.png').convert('RGB')
pixels = img.load()

# Find all pixels in x_local in 400..650, y_local in 100..450 with brightness > 140
brights = []
for y in range(100, 450):
    for x in range(400, 650):
        r, g, b = pixels[x, y]
        if r > 130 and max(r,g,b)-min(r,g,b) < 15:
            brights.append((x + 8800, y + 9400, r))

print(f"Found {len(brights)} painted line pixels!")
if brights:
    print("Sample lines:", brights[:10])
