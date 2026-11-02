"""Generate AI traffic loops and pedestrian walking paths from the real campus tiles.

The Zoom 19 collision tiles are classified per pixel into road asphalt, sidewalk,
grass and blocked (buildings, walls, water). Cars are routed with A* along the
centre of the asphalt and offset into the right-hand lane; pedestrians are routed
along sidewalks, may cut across grass or cross a street, and can never enter a
building footprint. Results are written into the map JSON as `traffic_routes`,
`traffic_cars` and `pedestrian_paths`, which the frontend renderer follows.

Usage:  python generate_ai_routes.py [--preview out.png]
Requires numpy and Pillow (dev-only, not part of the API requirements).
"""
import argparse
import heapq
import json
import math
import random
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

BACKEND_DIR = Path(__file__).resolve().parent
TILES_DIR = BACKEND_DIR / "data" / "collision_tiles"
MAP_FILE = BACKEND_DIR / "data" / "maps" / "selu_campus.json"

ORIGIN_X, ORIGIN_Y = 130375, 215420
CELL = 4  # world pixels per nav-grid cell

ROAD, WALK, GRASS, BLOCKED, CROSSWALK = 0, 1, 2, 3, 4

# Car loops: anchor points (world px) on real roads, visited in order and closed back to the first.
# A* fills in the road geometry between anchors, so anchors only need to sit on the asphalt.
CAR_LOOPS = [
    {
        "id": "loop_perimeter_cw",
        "name": "Main Campus Perimeter (clockwise)",
        "anchors": [(4940, 6540), (7000, 6530), (8500, 6530), (9500, 7700), (9600, 10000),
                    (9760, 11000), (10040, 12000), (10260, 12870), (8000, 12860), (6200, 12870),
                    (4940, 12860), (4940, 11000), (4940, 9000)],
        "cars": [("#e2e8f0", 0.02), ("#1e293b", 0.27), ("#dc2626", 0.52), ("#94a3b8", 0.77)],
    },
    {
        "id": "loop_perimeter_ccw",
        "name": "Main Campus Perimeter (counter-clockwise)",
        "anchors": [(4940, 9000), (4940, 11000), (4940, 12860), (6200, 12870), (8000, 12860),
                    (10260, 12870), (10040, 12000), (9760, 11000), (9600, 10000), (9500, 7700),
                    (8500, 6530), (7000, 6530), (4940, 6540)],
        "cars": [("#f8fafc", 0.12), ("#b45309", 0.45), ("#475569", 0.8)],
    },
    {
        "id": "loop_mane_st",
        "name": "Mane Street Loop",
        "anchors": [(7480, 7000), (7480, 6530), (8500, 6530), (9500, 7700), (9600, 9300),
                    (8600, 9600), (7560, 9760), (7480, 8500)],
        "cars": [("#15803d", 0.2), ("#7c2d12", 0.7)],
    },
    {
        "id": "loop_north_campus",
        "name": "Lion Lane / North Campus",
        "anchors": [(1745, 6540), (1745, 5000), (1745, 3600), (2500, 3560), (3210, 3700),
                    (3210, 5000), (3210, 6540), (2500, 6540)],
        "cars": [("#d97706", 0.1), ("#64748b", 0.6)],
    },
    {
        "id": "loop_university_center",
        "name": "University Center Loop",
        "anchors": [(3210, 4720), (4100, 4720), (4940, 4720), (4940, 5600), (4940, 6540),
                    (4100, 6540), (3210, 6540), (3210, 5600)],
        "cars": [("#0f766e", 0.15), ("#334155", 0.65)],
    },
]

PED_REGION = (1200, 3000, 10600, 15200)  # x0, y0, x1, y1 of campus area where students walk
PED_SHIRTS = ["#00573D", "#FFC72C", "#f8fafc", "#1e3a8a", "#dc2626", "#2563eb", "#475569", "#166534"]
NUM_PEDESTRIANS = 70  # roadside sidewalk walkers, on top of crosswalk and parking-lot walkers
NUM_LOT_WALKERS = 45
LOT_WALKERS_PER_MISSION = 10
ROADSIDE_DISTANCE = 50  # world px; sidewalk walkers start and end this close to a street or lot
LANE_OFFSET = 11.0


def load_world_image(x0, y0, x1, y1):
    img = Image.new("RGB", (x1 - x0, y1 - y0), (255, 0, 255))
    for tx in range(x0 // 512, (x1 - 1) // 512 + 1):
        for ty in range(y0 // 512, (y1 - 1) // 512 + 1):
            f = TILES_DIR / f"19_{tx + ORIGIN_X}_{ty + ORIGIN_Y}.webp"
            if f.exists():
                img.paste(Image.open(f).convert("RGB"), (tx * 512 - x0, ty * 512 - y0))
    return img


def box_mean(m, n, axis):
    """Mean of m over a centred window of n pixels along one axis."""
    pad = [(0, 0), (0, 0)]
    pad[axis] = (n // 2 + 1, n - n // 2 - 1)
    c = np.cumsum(np.pad(m.astype(np.float32), pad), axis=axis)
    return (c[n:] - c[:-n]) / n if axis == 0 else (c[:, n:] - c[:, :-n]) / n


def find_zebra_stripes(a):
    """Pixels belonging to zebra crosswalks: 3+ short, thick, light-gray bars stacked side by side."""
    mx, mn = a.max(-1), a.min(-1)
    paint = (mx - mn <= 8) & (mn >= 132) & (mx <= 190)
    out = np.zeros(paint.shape, bool)
    for along, across in ((1, 0), (0, 1)):
        # Bar pixels sit in a long run along the bar but a thin run across it
        bar = (paint & (box_mean(paint, 15, along) >= 0.9) & (box_mean(paint, 4, across) >= 0.9)
               & (box_mean(paint, 15, across) <= 0.75))
        starts = np.zeros(bar.shape, np.float32)
        if across == 0:
            starts[1:] = bar[1:] & ~bar[:-1]
        else:
            starts[:, 1:] = bar[:, 1:] & ~bar[:, :-1]
        stacked = box_mean(starts, 48, across) * 48 >= 3
        out |= stacked & (box_mean(bar, 9, along) > 0.3)
    return out


class NavGrid:
    """Coarse per-cell surface classification over a world-space rectangle."""

    def __init__(self, x0, y0, x1, y1):
        self.x0, self.y0 = x0, y0
        img = load_world_image(x0, y0, x1, y1)
        a = np.asarray(img).astype(np.int16)
        mx, mn = a.max(-1), a.min(-1)
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        road = (mx - mn <= 6) & (mx >= 70) & (mx <= 125)
        walk = (mx - mn <= 5) & (mn >= 205)
        grass = (g > r + 15) & (g > b + 15) & (g >= 70)

        # Close small holes in the asphalt left by painted street names and lane markings
        road_img = Image.fromarray((road * 255).astype(np.uint8))
        road_img = road_img.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))
        road = np.asarray(road_img) > 127

        # Zebra crosswalk stripes, found in horizontal bands to keep memory bounded
        zebra = np.zeros(road.shape, bool)
        band, overlap = 1024, 64
        for top in range(0, a.shape[0], band):
            lo, hi = max(0, top - overlap), min(a.shape[0], top + band + overlap)
            zebra[top: top + band] = find_zebra_stripes(a[lo:hi])[top - lo: top - lo + band]
        zebra &= road  # stripes painted on asphalt only; drops look-alike texture on roofs

        h, w = road.shape[0] // CELL, road.shape[1] // CELL

        def frac(m):
            return m[: h * CELL, : w * CELL].reshape(h, CELL, w, CELL).mean(axis=(1, 3))

        rf, wf, gf, zf = frac(road), frac(walk), frac(grass), frac(zebra)
        cls = np.full((h, w), BLOCKED, np.uint8)
        cls[gf >= 0.5] = GRASS
        cls[wf >= 0.35] = WALK
        cls[rf >= 0.6] = ROAD
        cls[(zf >= 0.2) & (rf >= 0.6)] = CROSSWALK
        self.cls = cls
        self.h, self.w = h, w
        self.road_depth = self._depth((cls == ROAD) | (cls == CROSSWALK))

    @staticmethod
    def _depth(mask, max_steps=8):
        """Cells-from-edge for a boolean mask (cheap iterative erosion distance)."""
        depth = np.zeros(mask.shape, np.uint8)
        cur = mask.copy()
        for i in range(1, max_steps + 1):
            depth[cur] = i
            nxt = cur.copy()
            nxt[1:, :] &= cur[:-1, :]
            nxt[:-1, :] &= cur[1:, :]
            nxt[:, 1:] &= cur[:, :-1]
            nxt[:, :-1] &= cur[:, 1:]
            cur = nxt
        return depth

    def to_cell(self, x, y):
        return int((y - self.y0) // CELL), int((x - self.x0) // CELL)

    def to_world(self, r, c):
        return (self.x0 + c * CELL + CELL / 2, self.y0 + r * CELL + CELL / 2)

    def snap(self, x, y, ok, radius=40):
        r0, c0 = self.to_cell(x, y)
        best = None
        for dr in range(-radius, radius + 1):
            for dc in range(-radius, radius + 1):
                r, c = r0 + dr, c0 + dc
                if 0 <= r < self.h and 0 <= c < self.w and ok(r, c):
                    d = dr * dr + dc * dc
                    if best is None or d < best[0]:
                        best = (d, r, c)
        if best is None:
            raise ValueError(f"No valid cell near ({x}, {y})")
        return best[1], best[2]


NEIGHBORS = [(-1, 0, 1.0), (1, 0, 1.0), (0, -1, 1.0), (0, 1, 1.0),
             (-1, -1, 1.414), (-1, 1, 1.414), (1, -1, 1.414), (1, 1, 1.414)]


def astar(grid, start, goal, cost_fn, max_expand=6_000_000):
    h, w = grid.h, grid.w
    gr, gc = goal
    dist = {start: 0.0}
    prev = {}
    pq = [(0.0, start)]
    expanded = 0
    while pq:
        _, cur = heapq.heappop(pq)
        if cur == goal:
            path = [cur]
            while cur in prev:
                cur = prev[cur]
                path.append(cur)
            return path[::-1]
        expanded += 1
        if expanded > max_expand:
            break
        r, c = cur
        d0 = dist[cur]
        for dr, dc, step in NEIGHBORS:
            nr, nc = r + dr, c + dc
            if not (0 <= nr < h and 0 <= nc < w):
                continue
            cell_cost = cost_fn(nr, nc)
            if cell_cost is None:
                continue
            nd = d0 + step * cell_cost
            if nd < dist.get((nr, nc), math.inf):
                dist[(nr, nc)] = nd
                prev[(nr, nc)] = cur
                heapq.heappush(pq, (nd + math.hypot(nr - gr, nc - gc), (nr, nc)))
    return None


def simplify(points, eps):
    """Ramer-Douglas-Peucker polyline simplification."""
    if len(points) < 3:
        return points
    (x1, y1), (x2, y2) = points[0], points[-1]
    seg = math.hypot(x2 - x1, y2 - y1) or 1e-9
    best_i, best_d = 0, -1.0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        d = abs((x2 - x1) * (y1 - py) - (x1 - px) * (y2 - y1)) / seg
        if d > best_d:
            best_i, best_d = i, d
    if best_d <= eps:
        return [points[0], points[-1]]
    left = simplify(points[: best_i + 1], eps)
    right = simplify(points[best_i:], eps)
    return left[:-1] + right


def round_corners(points, closed, max_cut=14.0, passes=2):
    """Chaikin corner cutting with the cut length capped so long straights stay on the lane."""
    for _ in range(passes):
        n = len(points)
        out = []
        rng = range(n) if closed else range(n - 1)
        if not closed:
            out.append(points[0])
        for i in rng:
            p, q = points[i], points[(i + 1) % n]
            L = math.hypot(q[0] - p[0], q[1] - p[1])
            if L < 1e-6:
                continue
            t = min(0.25, max_cut / L)
            out.append((p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t))
            out.append((p[0] + (q[0] - p[0]) * (1 - t), p[1] + (q[1] - p[1]) * (1 - t)))
        if not closed:
            out.append(points[-1])
        points = out
    return points


def offset_right(points, offset):
    """Shift a closed loop to the right-hand side of travel (y-down screen space)."""
    n = len(points)
    out = []
    for i in range(n):
        a, b, c = points[i - 1], points[i], points[(i + 1) % n]
        d1 = (b[0] - a[0], b[1] - a[1])
        d2 = (c[0] - b[0], c[1] - b[1])
        l1 = math.hypot(*d1) or 1e-9
        l2 = math.hypot(*d2) or 1e-9
        n1 = (-d1[1] / l1, d1[0] / l1)
        n2 = (-d2[1] / l2, d2[0] / l2)
        nx, ny = n1[0] + n2[0], n1[1] + n2[1]
        ln = math.hypot(nx, ny) or 1e-9
        nx, ny = nx / ln, ny / ln
        scale = offset / max(0.5, nx * n2[0] + ny * n2[1])  # miter, clamped on hairpins
        out.append((b[0] + nx * scale, b[1] + ny * scale))
    return out


def build_car_route(grid, loop):
    def cost(r, c):
        if grid.cls[r, c] not in (ROAD, CROSSWALK):
            return None
        d = grid.road_depth[r, c]
        return 1.0 + 6.0 / d  # strongly prefer the middle of the carriageway

    def on_road_center(r, c):
        return grid.road_depth[r, c] >= 3

    cells = [grid.snap(x, y, on_road_center) for x, y in loop["anchors"]]
    pts = []
    for a, b in zip(cells, cells[1:] + cells[:1]):
        seg = astar(grid, a, b, cost)
        if seg is None:
            raise RuntimeError(f"{loop['id']}: no road path between {grid.to_world(*a)} and {grid.to_world(*b)}")
        pts.extend(grid.to_world(r, c) for r, c in seg[:-1])
    # Simplify as two open halves; RDP is undefined for a single closed ring
    mid = len(pts) // 2
    pts = simplify(pts[: mid + 1], eps=3.0)[:-1] + simplify(pts[mid:] + [pts[0]], eps=3.0)[:-1]
    pts = offset_right(pts, LANE_OFFSET)
    pts = round_corners(pts, closed=True)
    return [[round(x, 1), round(y, 1)] for x, y in pts]


def walkable_component(grid, seed, passable):
    seen = np.zeros((grid.h, grid.w), bool)
    q = deque([seed])
    seen[seed] = True
    while q:
        r, c = q.popleft()
        for dr, dc, _ in NEIGHBORS[:4]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < grid.h and 0 <= nc < grid.w and not seen[nr, nc] and passable[nr, nc]:
                seen[nr, nc] = True
                q.append((nr, nc))
    return seen


def build_crosswalk_paths(grid, rng, cost, endpoints_ok):
    """One student per painted crosswalk, walking back and forth across the street."""
    xwalk = grid.cls == CROSSWALK
    # Individual stripes classify as separate specks; grow them so one crosswalk is one blob
    merged = xwalk.copy()
    for _ in range(3):
        grown = merged.copy()
        grown[1:, :] |= merged[:-1, :]
        grown[:-1, :] |= merged[1:, :]
        grown[:, 1:] |= merged[:, :-1]
        grown[:, :-1] |= merged[:, 1:]
        merged = grown & (grid.road_depth > 0)
    # Asphalt a crossing student may touch: the striped band plus its unpainted margins
    band = merged.copy()
    for _ in range(3):
        grown = band.copy()
        grown[1:, :] |= band[:-1, :]
        grown[:-1, :] |= band[1:, :]
        grown[:, 1:] |= band[:, :-1]
        grown[:, :-1] |= band[:, 1:]
        band = grown
    seen = np.zeros_like(xwalk)
    paths = []
    for seed in map(tuple, np.argwhere(xwalk)):
        if seen[seed]:
            continue
        blob = walkable_component(grid, seed, merged)
        seen |= blob
        cells = np.argwhere(blob & xwalk).astype(float)
        if len(cells) < 8:
            continue
        center = cells.mean(axis=0)
        # Principal axes of the striped patch; the walking direction is usually the long one
        evals, evecs = np.linalg.eigh(np.cov((cells - center).T))
        for axis in (evecs[:, 1], evecs[:, 0]):
            half = np.abs((cells - center) @ axis).max()
            ends = []
            for sign in (-1, 1):
                r, c = center + sign * axis * (half + 35 / CELL)
                x, y = grid.to_world(r, c)
                try:
                    ends.append(grid.snap(x, y, lambda rr, cc: endpoints_ok[rr, cc], radius=16))
                except ValueError:
                    break
            if len(ends) < 2:
                continue
            route = astar(grid, ends[0], ends[1], cost, max_expand=200_000)
            if not route:
                continue
            classes = [int(grid.cls[r, c]) for r, c in route]
            off_band_road = sum(1 for r, c in route if grid.cls[r, c] == ROAD and not band[r, c])
            if classes.count(CROSSWALK) < 3 or off_band_road > 0:
                continue
            pts = [[round(x, 1), round(y, 1)] for x, y in simplify([grid.to_world(r, c) for r, c in route], eps=4.0)]
            # Two students per crosswalk, one starting from each curb
            for points in (pts, pts[::-1]):
                paths.append({
                    "id": f"ped_xwalk_{len(paths)}",
                    "points": points,
                    "speed": round(rng.uniform(19, 25), 1),
                    "shirt": PED_SHIRTS[len(paths) % len(PED_SHIRTS)],
                })
            break
    return paths


def build_lot_walker_paths(grid, rng, lots, mission_lot_ids, cost, endpoints_ok):
    """Students walking between a parking stall and the nearest sidewalk, right where the player hunts for spots."""
    lot_img = Image.new("L", (grid.w, grid.h), 0)
    draw = ImageDraw.Draw(lot_img)
    for lot in lots:
        if lot.get("polygon") and len(lot["polygon"]) >= 3:
            draw.polygon([((x - grid.x0) / CELL, (y - grid.y0) / CELL) for x, y in lot["polygon"]], fill=255)
    in_lot = np.asarray(lot_img) > 0

    def lot_cost(r, c):
        if grid.cls[r, c] == ROAD and in_lot[r, c]:
            return 1.5  # crossing a lot aisle on foot is normal
        return cost(r, c)

    paths = []

    def try_add(stall, spacing):
        if any(math.hypot(stall["x"] - p["points"][0][0], stall["y"] - p["points"][0][1]) < spacing for p in paths):
            return
        try:
            start = grid.snap(stall["x"], stall["y"], lambda r, c: in_lot[r, c] and grid.cls[r, c] == ROAD, radius=6)
            end = grid.snap(stall["x"], stall["y"], lambda r, c: endpoints_ok[r, c], radius=40)
        except ValueError:
            return
        route = astar(grid, start, end, lot_cost, max_expand=100_000)
        if not route or not 15 <= len(route) <= 90:
            return
        # Stay on the lot or sidewalks: no wandering down the open street
        if sum(1 for r, c in route if grid.cls[r, c] == ROAD and not in_lot[r, c]) > 2:
            return
        pts = simplify([grid.to_world(r, c) for r, c in route], eps=4.0)
        paths.append({
            "id": f"ped_lot_{len(paths)}",
            "points": [[round(x, 1), round(y, 1)] for x, y in pts],
            "speed": round(rng.uniform(18, 24), 1),
            "shirt": PED_SHIRTS[len(paths) % len(PED_SHIRTS)],
        })

    # Every mission's target lots get a guaranteed crowd, since that's where the player hunts for a stall
    lots_by_id = {lot["id"]: lot for lot in lots}
    for lot_ids in mission_lot_ids:
        stalls = [s for lid in lot_ids for s in lots_by_id.get(lid, {}).get("stalls", [])]
        goal = len(paths) + LOT_WALKERS_PER_MISSION
        for _ in range(300):
            if not stalls or len(paths) >= goal:
                break
            try_add(stalls[rng.randrange(len(stalls))], spacing=90)

    stalls = [s for lot in lots for s in lot.get("stalls", [])]
    goal = len(paths) + NUM_LOT_WALKERS
    for _ in range(1500):
        if len(paths) >= goal:
            break
        try_add(stalls[rng.randrange(len(stalls))], spacing=150)
    return paths


def build_pedestrian_paths(grid, rng, lots, mission_lot_ids):
    passable = grid.cls != BLOCKED
    walk = grid.cls == WALK
    # Cells within 2 cells of a building/wall; keeps students off roof edges and white roof patches
    near_blocked = ~passable
    for _ in range(2):
        grown = near_blocked.copy()
        grown[1:, :] |= near_blocked[:-1, :]
        grown[:-1, :] |= near_blocked[1:, :]
        grown[:, 1:] |= near_blocked[:, :-1]
        grown[:, :-1] |= near_blocked[:, 1:]
        near_blocked = grown
    open_walk = walk & ~near_blocked

    # Flood-fill from a known open sidewalk so isolated white roof patches are never used
    hub = grid.snap(8600, 10450, lambda r, c: open_walk[r, c])
    reachable = walkable_component(grid, hub, passable)
    rx0, ry0, rx1, ry1 = PED_REGION
    in_region = np.zeros_like(walk)
    r0, c0 = grid.to_cell(rx0, ry0)
    r1, c1 = grid.to_cell(rx1, ry1)
    in_region[r0:r1, c0:c1] = True
    # Sidewalks along streets and lots, where a driver actually sees students
    near_road = (grid.cls == ROAD) | (grid.cls == CROSSWALK)
    for _ in range(ROADSIDE_DISTANCE // CELL):
        grown = near_road.copy()
        grown[1:, :] |= near_road[:-1, :]
        grown[:-1, :] |= near_road[1:, :]
        grown[:, 1:] |= near_road[:, :-1]
        grown[:, :-1] |= near_road[:, 1:]
        near_road = grown
    candidates = np.argwhere(open_walk & reachable & in_region & near_road)

    # Streets are only crossed at painted crosswalks; open asphalt is a heavy jaywalking penalty
    cost_by_class = {WALK: 1.0, CROSSWALK: 1.0, GRASS: 7.0, ROAD: 40.0}

    def cost(r, c):
        base = cost_by_class.get(int(grid.cls[r, c]))
        if base is not None and near_blocked[r, c] and grid.cls[r, c] != CROSSWALK:
            base += 4.0
        return base

    paths = build_crosswalk_paths(grid, rng, cost, open_walk & reachable)
    paths += build_lot_walker_paths(grid, rng, lots, mission_lot_ids, cost, open_walk & reachable)
    attempts = 0
    target = len(paths) + NUM_PEDESTRIANS
    while len(paths) < target and attempts < 4000:
        attempts += 1
        a = tuple(candidates[rng.randrange(len(candidates))])
        b = tuple(candidates[rng.randrange(len(candidates))])
        span = math.hypot(a[0] - b[0], a[1] - b[1]) * CELL
        if not 220 <= span <= 650:
            continue
        cells = astar(grid, a, b, cost, max_expand=400_000)
        if not cells:
            continue
        classes = [int(grid.cls[r, c]) for r, c in cells]
        walk_share = classes.count(WALK) / len(classes)
        road_share = classes.count(ROAD) / len(classes)
        roadside_share = sum(1 for r, c in cells if near_road[r, c]) / len(cells)
        if walk_share < 0.7 or road_share > 0.12 or roadside_share < 0.6:
            continue
        pts = simplify([grid.to_world(r, c) for r, c in cells], eps=4.0)
        far_from_others = all(math.hypot(pts[0][0] - p["points"][0][0], pts[0][1] - p["points"][0][1]) > 120
                              for p in paths)
        if not far_from_others:
            continue
        paths.append({
            "id": f"ped_{len(paths)}",
            "points": [[round(x, 1), round(y, 1)] for x, y in pts],
            "speed": round(rng.uniform(19, 27), 1),
            "shirt": PED_SHIRTS[len(paths) % len(PED_SHIRTS)],
        })
    return paths


def preview(path, routes, peds, region):
    x0, y0, x1, y1 = region
    img = load_world_image(x0, y0, x1, y1)
    d = ImageDraw.Draw(img)
    for r in routes:
        pts = [(x - x0, y - y0) for x, y in r["points"]]
        d.line(pts + pts[:1], fill=(0, 90, 255), width=5)
    for p in peds:
        d.line([(x - x0, y - y0) for x, y in p["points"]], fill=(255, 0, 0), width=4)
    img.thumbnail((2400, 2400))
    img.save(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", help="write a PNG of the generated paths over the map")
    args = parser.parse_args()

    with open(MAP_FILE, "r", encoding="utf-8") as f:
        campus = json.load(f)

    print("Classifying campus tiles...")
    grid = NavGrid(512, 1024, 12800, 15872)

    routes, cars = [], []
    for loop in CAR_LOOPS:
        print(f"Routing {loop['id']}...")
        routes.append({"id": loop["id"], "name": loop["name"], "points": build_car_route(grid, loop)})
        for i, (color, start) in enumerate(loop["cars"]):
            cars.append({"id": f"{loop['id']}_{i}", "route_id": loop["id"], "color": color,
                         "speed": 72 + (i * 7) % 12, "start_prog": start})

    print("Routing pedestrians...")
    mission_lot_ids = [d.get("target_lot_ids", []) for d in campus.get("destinations", [])]
    peds = build_pedestrian_paths(grid, random.Random(4550), campus.get("lots", []), mission_lot_ids)

    campus["traffic_routes"] = routes
    campus["traffic_cars"] = cars
    campus["pedestrian_paths"] = peds
    with open(MAP_FILE, "w", encoding="utf-8") as f:
        json.dump(campus, f, indent=2)
    print(f"Wrote {len(routes)} traffic routes, {len(cars)} cars, {len(peds)} pedestrians to {MAP_FILE.name}")

    if args.preview:
        preview(args.preview, routes, peds, (1200, 3000, 10400, 13400))


if __name__ == "__main__":
    main()
