import math
from pathlib import Path
from PIL import Image, ImageDraw

SCRATCH = Path(r'C:\Users\imeli\SELU-Parking-Sim\brain\scratch' if False else r'C:\Users\imeli\.gemini\antigravity\brain\26fe171f-d5c4-4561-97bd-508195ced502\scratch')
TILES_DIR = Path(r'c:\Users\imeli\SELU-Parking-Sim\backend\data\tiles')

im = Image.open(TILES_DIR / "19_130393_215439.webp").convert('RGBA')
w, h = im.size
px = im.load()

is_asphalt = [[False]*w for _ in range(h)]
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a >= 128 and 68 <= r <= 120 and max(r, g, b) - min(r, g, b) <= 10:
            is_asphalt[y][x] = True

line_pixels = set()
for y in range(6, h - 6):
    for x in range(6, w - 6):
        r, g, b, a = px[x, y]
        sat = max(r, g, b) - min(r, g, b)
        if 125 <= r <= 225 and sat <= 12:
            # Must have asphalt nearby (within radius 6)
            has_asp = any(is_asphalt[y+dy][x+dx] for dx, dy in [(-5,0), (5,0), (0,-5), (0,5), (-4,-4), (4,4), (-4,4), (4,-4)])
            if has_asp:
                line_pixels.add((x, y))

visited = set()
segments = []
for pt in line_pixels:
    if pt in visited: continue
    comp = [pt]; visited.add(pt); queue = [pt]
    while queue:
        cx, cy = queue.pop()
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx == 0 and dy == 0: continue
                npt = (cx + dx, cy + dy)
                if npt in line_pixels and npt not in visited:
                    visited.add(npt); queue.append(npt); comp.append(npt)
    
    if len(comp) >= 15:
        mx = sum(p[0] for p in comp) / len(comp)
        my = sum(p[1] for p in comp) / len(comp)
        c_xx = sum((p[0] - mx)**2 for p in comp)
        c_yy = sum((p[1] - my)**2 for p in comp)
        c_xy = sum((p[0] - mx)*(p[1] - my) for p in comp)
        theta = 0.5 * math.atan2(2 * c_xy, c_xx - c_yy)
        ca, sa = math.cos(theta), math.sin(theta)
        u_vals = [(p[0] - mx) * ca + (p[1] - my) * sa for p in comp]
        v_vals = [-(p[0] - mx) * sa + (p[1] - my) * ca for p in comp]
        length = max(u_vals) - min(u_vals)
        thick = max(v_vals) - min(v_vals)
        if 20 <= length <= 55 and thick <= 5.5:
            segments.append({
                'cx': mx, 'cy': my, 'theta': theta,
                'deg': math.degrees(theta) % 180.0, 'length': length
            })

print(f"Total clean divider segments in tile: {len(segments)}")

stalls = []
for i in range(len(segments)):
    segA = segments[i]
    best_pair = None
    min_dist_diff = 999
    for j in range(len(segments)):
        if i == j: continue
        segB = segments[j]
        d_theta = ((segB['theta'] - segA['theta'] + math.pi/2) % math.pi) - math.pi/2
        if abs(d_theta) > math.radians(14): continue
        avg_theta = segA['theta'] + d_theta / 2.0
        ca = math.cos(avg_theta)
        sa = math.sin(avg_theta)
        dx = segB['cx'] - segA['cx']
        dy = segB['cy'] - segA['cy']
        long_offset = abs(dx * ca + dy * sa)
        trans_offset = abs(-dx * sa + dy * ca)
        if 14.0 <= trans_offset <= 28.0 and long_offset <= 14.0:
            score = abs(trans_offset - 20.0) + long_offset * 0.4
            if score < min_dist_diff:
                min_dist_diff = score
                best_pair = (segB, trans_offset, avg_theta)

    if best_pair:
        segB, trans_offset, avg_theta = best_pair
        scx = (segA['cx'] + segB['cx']) / 2.0
        scy = (segA['cy'] + segB['cy']) / 2.0
        avg_len = (segA['length'] + segB['length']) / 2.0
        if all(math.hypot(scx - s['cx'], scy - s['cy']) > 11 for s in stalls):
            stalls.append({
                'cx': scx, 'cy': scy, 'theta': avg_theta,
                'deg': math.degrees(avg_theta) % 360.0,
                'length': avg_len, 'width': trans_offset
            })

print(f"Extracted {len(stalls)} stalls by line pairing!")

out = im.copy()
draw = ImageDraw.Draw(out)
for s in stalls:
    cx, cy = s['cx'], s['cy']
    ca = math.cos(s['theta'])
    sa = math.sin(s['theta'])
    hl = s['length'] / 2.0
    hw = s['width'] / 2.0
    corners = [
        (cx + du * ca - dv * sa, cy + du * sa + dv * ca)
        for du, dv in [(-hl, -hw), (hl, -hw), (hl, hw), (-hl, hw)]
    ]
    draw.polygon(corners, outline=(0, 255, 100, 255), width=2)

out.save(SCRATCH / 'tile_all_paired_stalls.png')
print("Saved tile_all_paired_stalls.png")
