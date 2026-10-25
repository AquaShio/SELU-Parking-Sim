from PIL import Image

img = Image.open('scratch/anzalone_area.png').convert('RGB')
pixels = img.load()

# Find diagonal lines in the middle lot (x_world in [9220, 9420], y_world in [9560, 9820])
# Let's inspect where the line segments are:
line_pixels = []
for y in range(9560, 9820):
    y_local = y - 9400
    for x in range(9220, 9420):
        x_local = x - 8800
        r, g, b = pixels[x_local, y_local]
        if r > 135 and max(r,g,b)-min(r,g,b) < 15:
            line_pixels.append((x, y))

print(f"Total line pixels in middle lot: {len(line_pixels)}")

# Let's find the centers of the stalls between these lines!
# Each stall is between two lines.
# In Image 1, we clearly see:
# Row 1 (upper diagonal): angled at ~60-70 degrees
# Row 2 (lower diagonal): angled at ~60-70 degrees

# Let's calculate the bounding box and distribution of x and y
xs = [p[0] for p in line_pixels]
ys = [p[1] for p in line_pixels]
print(f"X range: {min(xs)} to {max(xs)}")
print(f"Y range: {min(ys)} to {max(ys)}")
