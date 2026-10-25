from PIL import Image

img = Image.open('scratch/anzalone_area.png').convert('RGB')
pixels = img.load()

# Let's inspect a horizontal slice across the diagonal lines:
# Around y_world = 9650 (y_local = 250), x_world from 9200 to 9450 (x_local from 400 to 650)
y_local = 250
print("Pixel colors along y_world=9650:")
for x_local in range(400, 650, 10):
    print(f"  x={x_local+8800}: {pixels[x_local, y_local]}")
