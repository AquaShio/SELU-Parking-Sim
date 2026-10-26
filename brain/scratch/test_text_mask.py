from PIL import Image
from pathlib import Path

TILES_DIR = Path(r'c:\Users\imeli\SELU-Parking-Sim\backend\data\tiles')
im = Image.open(TILES_DIR / "19_130381_215427.webp").convert('RGBA')
w, h = im.size
px = im.load()

is_asphalt = [[False]*w for _ in range(h)]
mask = [[False]*w for _ in range(h)]

for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a < 128: continue
        sat = max(r, g, b) - min(r, g, b)
        # Tree foliage exclusion
        if g > r + 7 and g > b + 10: continue
        if 66 <= r <= 122 and sat <= 10:
            is_asphalt[y][x] = True
            mask[y][x] = True

# Pass 2: Any painted road markings (lines, crosswalks, text "LION LN", "ONLY", etc.)
# Neutral white/gray (r > 122, sat <= 16) or yellow paint
for y in range(h):
    for x in range(w):
        if mask[y][x]: continue
        r, g, b, a = px[x, y]
        if a < 128: continue
        sat = max(r, g, b) - min(r, g, b)
        if g > r + 7 and g > b + 10: continue # not tree foliage
        
        is_neutral = (r > 120 and sat <= 16)
        is_yellow = (r >= 165 and g >= 135 and b <= 115)
        if is_neutral or is_yellow:
            # Check for asphalt within 20 pixels horizontally or vertically
            has_asp_left = any(is_asphalt[y][x - d] for d in range(3, 22) if x - d >= 0)
            has_asp_right = any(is_asphalt[y][x + d] for d in range(3, 22) if x + d < w)
            has_asp_up = any(is_asphalt[y - d][x] for d in range(3, 22) if y - d >= 0)
            has_asp_down = any(is_asphalt[y + d][x] for d in range(3, 22) if y + d < h)
            
            # If flanked by asphalt on both sides (horizontally or vertically)
            if (has_asp_left and has_asp_right) or (has_asp_up and has_asp_down):
                mask[y][x] = True

# Pass 3: Fill any remaining gaps inside painted text / crosswalks (dilation over neutral paint)
for _ in range(3):
    new_mask = [row[:] for row in mask]
    for y in range(2, h - 2):
        for x in range(2, w - 2):
            if mask[y][x]: continue
            r, g, b, a = px[x, y]
            sat = max(r, g, b) - min(r, g, b)
            if g > r + 7 and g > b + 10: continue
            if r > 110 and sat <= 16:
                # If adjacent to drivable surface
                if mask[y][x-1] or mask[y][x+1] or mask[y-1][x] or mask[y+1][x]:
                    new_mask[y][x] = True
    mask = new_mask

text_pixels = []
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        sat = max(r, g, b) - min(r, g, b)
        if r >= 210 and g >= 210 and b >= 210 and sat <= 8:
            text_pixels.append((x, y))

in_mask = [p for p in text_pixels if mask[p[1]][p[0]]]
print(f"WITH IMPROVED CHECK: Text pixels in mask: {len(in_mask)} / {len(text_pixels)} ({len(in_mask)/len(text_pixels)*100:.1f}%)")
