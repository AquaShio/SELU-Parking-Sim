import json
import math
from pathlib import Path
from PIL import Image

MAP_PATH = Path(r'c:\Users\imeli\SELU-Parking-Sim\backend\data\maps\selu_campus.json')
TILES_DIR = Path(r'c:\Users\imeli\SELU-Parking-Sim\backend\data\tiles')

with open(MAP_PATH, 'r', encoding='utf-8') as f:
    m = json.load(f)

ORIGIN_X = m['tile_origin_x']
ORIGIN_Y = m['tile_origin_y']

# Filter trees: each real tree in Concept3D has distinct high contrast foliage texture (standard deviation of green > 10)
# and is separated from other trees by at least 26 px
filtered_trees = []

# Let's inspect tile 19_130393_215439 to see tree vs lawn texture
im = Image.open(TILES_DIR / "19_130393_215439.webp").convert('RGBA')
px = im.load()
w, h = im.size

# Lawn pixels vs tree pixels:
# Lawn: smooth r: 100-112, g: 150-162, b: 82-95.
# Tree: r: 40-100, g: 60-140, b: 20-75 (darker olive foliage with shadows).
tree_candidates = []
for y in range(16, h - 16, 4):
    for x in range(16, w - 16, 4):
        r, g, b, a = px[x, y]
        # Real tree foliage in Concept3D is darker olive green with leaf shading, NOT bright pastel lawn
        # Lawn has r > 95 and g > 145!
        # Tree foliage has g <= 135 and g >= 48 and g > r + 8 and g > b + 15
        if 48 <= g <= 135 and g > r + 8 and g > b + 14:
            tree_candidates.append((x, y))

# Cluster into trees of radius ~18
distinct_trees = []
for cx, cy in tree_candidates:
    if not any(math.hypot(cx - t[0], cy - t[1]) < 24 for t in distinct_trees):
        # Verify it has at least 8 tree pixels around it
        cnt = sum(1 for ox, oy in tree_candidates if math.hypot(cx - ox, cy - oy) <= 18)
        if cnt >= 6:
            distinct_trees.append((cx, cy))

print(f"Distinct trees in Fayard tile: {len(distinct_trees)}")

# Let's run this clean tree filter across all tiles
all_clean_trees = []
for tf in TILES_DIR.glob("19_*.webp"):
    parts = tf.stem.split('_')
    tx = int(parts[1])
    ty = int(parts[2])
    base_wx = (tx - ORIGIN_X) * 512.0
    base_wy = (ty - ORIGIN_Y) * 512.0
    
    try:
        t_im = Image.open(tf).convert('RGBA')
        t_px = t_im.load()
        tw, th = t_im.size
        cands = []
        for y in range(16, th - 16, 5):
            for x in range(16, tw - 16, 5):
                r, g, b, a = t_px[x, y]
                if 48 <= g <= 135 and g > r + 8 and g > b + 14:
                    cands.append((x, y))
        
        tile_trees = []
        for cx, cy in cands:
            if not any(math.hypot(cx - t[0], cy - t[1]) < 26 for t in tile_trees):
                cnt = sum(1 for ox, oy in cands if math.hypot(cx - ox, cy - oy) <= 18)
                if cnt >= 5:
                    tile_trees.append((cx, cy))
                    all_clean_trees.append({
                        'x': round(base_wx + cx, 1),
                        'y': round(base_wy + cy, 1),
                        'radius': 14.0
                    })
    except Exception:
        pass

print(f"Total true trees detected across campus: {len(all_clean_trees)}")
m['trees'] = all_clean_trees

with open(MAP_PATH, 'w', encoding='utf-8') as f:
    json.dump(m, f, separators=(',', ':'))

print(f"Wrote clean map: {MAP_PATH.stat().st_size / 1024:.1f} KB")
