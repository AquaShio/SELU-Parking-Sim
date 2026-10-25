import math
from pathlib import Path
from PIL import Image

SCRATCH = Path(r'C:\Users\imeli\SELU-Parking-Sim\brain\scratch' if False else r'C:\Users\imeli\.gemini\antigravity\brain\26fe171f-d5c4-4561-97bd-508195ced502\scratch')
TILES_DIR = Path(r'c:\Users\imeli\SELU-Parking-Sim\backend\data\tiles')

# Let's count how many trees can be detected across all cached tiles
tile_files = list(TILES_DIR.glob("19_*.webp"))
print(f"Total Zoom 19 tiles: {len(tile_files)}")

ORIGIN_X = 130375
ORIGIN_Y = 215420

all_trees = []

for tf in tile_files:
    parts = tf.stem.split('_')
    tx = int(parts[1])
    ty = int(parts[2])
    base_wx = (tx - ORIGIN_X) * 512.0
    base_wy = (ty - ORIGIN_Y) * 512.0
    
    im = Image.open(tf).convert('RGBA')
    w, h = im.size
    px = im.load()
    
    foliage = []
    for y in range(8, h - 8, 2):
        for x in range(8, w - 8, 2):
            r, g, b, a = px[x, y]
            if a >= 128 and g > r + 8 and g > b + 12 and 45 <= g <= 170:
                foliage.append((x, y))
    
    # Cluster foliage into trees
    tile_trees = []
    visited = set()
    for fx, fy in foliage[::3]:
        if (fx, fy) in visited: continue
        cluster = [(fx, fy)]
        for ox, oy in foliage[::3]:
            if math.hypot(fx - ox, fy - oy) < 22:
                cluster.append((ox, oy))
                visited.add((ox, oy))
        if len(cluster) >= 14:
            cx = sum(p[0] for p in cluster) / len(cluster)
            cy = sum(p[1] for p in cluster) / len(cluster)
            if all(math.hypot(cx - t[0], cy - t[1]) > 18 for t in tile_trees):
                tile_trees.append((cx, cy))
                all_trees.append({
                    'x': round(base_wx + cx, 1),
                    'y': round(base_wy + cy, 1),
                    'radius': 14.0
                })

print(f"Extracted {len(all_trees)} solid trees across campus!")
