import { buildOBB } from './physics';

// Southeastern Louisiana University Official Palette
const COLORS = {
  seluGreen: '#00573D',
  seluDarkGreen: '#003626',
  seluGold: '#FFC72C',
  seluGoldGlow: 'rgba(255, 199, 44, 0.45)',
  grassFallback: '#6b9e58',
  stallLegal: '#10B981',
  stallIllegal: '#EF4444'
};

// Southeastern Hangtag Permit Colors
const PERMIT_COLORS = {
  freshman: '#703d2a',   // Brown
  upperclass: '#e3e12c', // Golden / Dark Yellow
  faculty: '#DC2626',    // Red
  resident: '#721226',   // Dark Burgundy
  commuter: '#e3e12c',
  visitor: '#10B981'
};

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Precompute cumulative arc lengths so AI agents can be placed by distance along a polyline
function buildPath(points, closed) {
  const pts = points.map(([x, y]) => ({ x, y }));
  if (closed) pts.push(pts[0]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return { pts, cum, total: cum[cum.length - 1] || 1, closed };
}

function samplePath(path, d) {
  const { pts, cum, total, closed } = path;
  d = closed ? ((d % total) + total) % total : Math.max(0, Math.min(total, d));
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= d) lo = mid; else hi = mid;
  }
  const a = pts[lo];
  const b = pts[hi];
  const segLen = cum[hi] - cum[lo] || 1;
  const t = (d - cum[lo]) / segLen;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
}

// Place a traffic car on its lane loop, heading along the chord through it so corners turn smoothly
function placeOnPath(tc) {
  const p = samplePath(tc.path, tc.dist);
  const back = samplePath(tc.path, tc.dist - 10);
  const front = samplePath(tc.path, tc.dist + 10);
  tc.x = p.x;
  tc.y = p.y;
  tc.heading = (Math.atan2(front.y - back.y, front.x - back.x) * 180) / Math.PI;
  tc.obb = buildOBB(tc.x, tc.y, (tc.heading * Math.PI) / 180, tc.length, tc.width, tc.id);
}

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Tyler's Dynamic Rotation Camera System
    this.camera = {
      x: 9248.7,
      y: 9788.8,
      zoom: 1.65,
      shake: 0,
      heading: null,
      rotation: 0,
      viewRadius: 750
    };

    this.parkedCarColors = [
      '#1e293b', '#2563eb', '#dc2626', '#f1f5f9',
      '#0f766e', '#b45309', '#475569', '#334155', '#7c2d12'
    ];

    this.tilesZ19 = new Map();
    this.tilesZ17 = new Map();
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 512;
    this.offscreenCanvas.height = 512;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

    this.map = null;
    this.occupiedStalls = [];
    this.occupiedStallIds = new Set();
    this.flashingCarId = null;
    this.flashTimer = 0;

    // Spatial hash grid for trees
    this.treeGrid = new Map();

    this.pedestrians = [];
    this.trafficCars = [];
    this.tireTracks = [];
    this.sparks = [];
    this.leaves = [];

    // --- DEBUG OVERLAY TOGGLE ---
    this.showDebugOverlay = false;

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === '=' || e.key === '=') {
        this.showDebugOverlay = !this.showDebugOverlay;
        console.log(`[Debug Overlay] ${this.showDebugOverlay ? 'ENABLED' : 'DISABLED'}`);
      }
    });
  }

  initEntities(map, difficulty = 1, spawnPoint = null) {
    this.map = map;
    this.tireTracks = [];
    this.sparks = [];
    this.leaves = [];
    this.occupiedStalls = [];
    this.occupiedStallIds.clear();

    const sx = spawnPoint?.x ?? map?.spawn?.x ?? 9248.7;
    const sy = spawnPoint?.y ?? map?.spawn?.y ?? 9788.8;
    this.camera.x = sx;
    this.camera.y = sy;
    this.camera.heading = null;

    // Populate spatial hash grid for trees
    this.treeGrid.clear();
    if (map && map.trees) {
      for (const t of map.trees) {
        const gx = Math.floor(t.x / 128);
        const gy = Math.floor(t.y / 128);
        const key = `${gx}_${gy}`;
        if (!this.treeGrid.has(key)) this.treeGrid.set(key, []);
        this.treeGrid.get(key).push(t);
      }
    }

    const occupancyRate = difficulty === 3 ? 0.72 : (difficulty === 2 ? 0.58 : 0.42);

    if (map && map.lots) {
      for (const lot of map.lots) {
        if (!lot.stalls) continue;
        for (let i = 0; i < lot.stalls.length; i++) {
          const stall = lot.stalls[i];
          const cx = stall.x;
          const cy = stall.y;

          if (Math.hypot(cx - sx, cy - sy) < 65) continue;

          const hash = Math.abs(Math.sin(stall.x * 12.9898 + stall.y * 78.233 + difficulty * 7.13) * 43758.5453) % 1;
          if (hash < occupancyRate && i % 4 !== 0) {
            const color = this.parkedCarColors[Math.floor(hash * 100) % this.parkedCarColors.length];
            const angleRad = ((stall.angle || 0) * Math.PI) / 180;
            const carLength = Math.min(29.0, stall.height * 0.78);
            const carWidth = Math.min(14.0, stall.width * 0.72);
            const obb = buildOBB(cx, cy, angleRad, carLength, carWidth, `parked_${stall.id}`);

            this.occupiedStalls.push({
              id: `parked_${stall.id}`,
              stallId: stall.id,
              cx,
              cy,
              angleRad,
              length: carLength,
              width: carWidth,
              color,
              obb
            });
            this.occupiedStallIds.add(stall.id);
          }
        }
      }
    }

    // Initialize Campus AI Traffic Cars
    this.trafficCars = [];
    const routes = new Map();
    for (const r of map?.traffic_routes || []) {
      if (r.points && r.points.length >= 2) routes.set(r.id, buildPath(r.points, true));
    }
    for (const c of map?.traffic_cars || []) {
      const path = routes.get(c.route_id);
      if (!path) continue;
      let dist = (c.start_prog || 0) * path.total;
      for (let tries = 0; tries < 20; tries++) {
        const p = samplePath(path, dist);
        if (Math.hypot(p.x - sx, p.y - sy) > 160) break;
        dist = (dist + 160) % path.total;
      }
      const tc = {
        id: c.id,
        routeId: c.route_id,
        path,
        dist,
        x: 0,
        y: 0,
        heading: 0,
        speed: c.speed,
        targetSpeed: c.speed,
        length: 29.0,
        width: 14.0,
        color: c.color,
        isBraking: false,
        obb: null
      };
      placeOnPath(tc);
      this.trafficCars.push(tc);
    }

    // Initialize Campus Student Pedestrians
    this.pedestrians = [];
    const hairColors = ['#451a03', '#78350f', '#0f172a', '#fbbf24', '#171717'];
    const skinColors = ['#fcd34d', '#fed7aa', '#fbcfe8', '#d97706', '#92400e'];
    const pantsColors = ['#1e293b', '#2563eb', '#334155', '#475569'];
    const backpackColors = ['#00573D', '#0f172a', '#b45309', '#1e3a8a'];

    (map?.pedestrian_paths || []).forEach((p, idx) => {
      if (!p.points || p.points.length < 2) return;
      const path = buildPath(p.points, false);
      const dist = ((idx * 0.618) % 1) * path.total;
      const pos = samplePath(path, dist);
      this.pedestrians.push({
        id: p.id || `ped_${idx}`,
        path,
        dist,
        dir: idx % 2 === 0 ? 1 : -1,
        pause: 0,
        x: pos.x,
        y: pos.y,
        speed: p.speed,
        angle: pos.angle,
        shirtColor: p.shirt,
        pantsColor: pantsColors[idx % pantsColors.length],
        backpackColor: backpackColors[idx % backpackColors.length],
        skinColor: skinColors[idx % skinColors.length],
        hairColor: hairColors[idx % hairColors.length],
        walkPhase: Math.random() * Math.PI * 2,
        isYielding: false
      });
    });

    this.preloadOverviewTiles();
  }

  preloadOverviewTiles() {
    for (let tx = 32593; tx <= 32599; tx++) {
      for (let ty = 53855; ty <= 53862; ty++) {
        this.getOrLoadZ17Tile(tx, ty);
      }
    }
  }

  getOrLoadZ17Tile(tx, ty_xyz) {
    const key = `17_${tx}_${ty_xyz}`;
    if (this.tilesZ17.has(key)) return this.tilesZ17.get(key);

    const entry = { loaded: false, failed: false, img: new Image() };
    entry.img.crossOrigin = 'anonymous';
    entry.img.onload = () => { entry.loaded = true; };
    entry.img.onerror = () => {
      if (!entry.triedFallback) {
        entry.triedFallback = true;
        const ty_tms = (131072 - 1) - ty_xyz;
        entry.img.src = `https://assets.concept3d.com/assets/2329/2329_Map_2_6a7e2bd2bd4ad/17/${tx}/${ty_tms}`;
      } else {
        entry.failed = true;
      }
    };
    entry.img.src = `/api/maps/tiles/17/${tx}/${ty_xyz}`;
    this.tilesZ17.set(key, entry);
    return entry;
  }

  getOrLoadZ19Tile(tx, ty_xyz) {
    const key = `19_${tx}_${ty_xyz}`;
    if (this.tilesZ19.has(key)) return this.tilesZ19.get(key);

    const entry = { loaded: false, failed: false, img: new Image(), mask: null };
    entry.img.crossOrigin = 'anonymous';
    entry.img.onload = () => {
      entry.loaded = true;
      entry.mask = this.computeDrivableMask(entry.img);
    };
    entry.img.onerror = () => {
      if (!entry.triedFallback) {
        entry.triedFallback = true;
        const ty_tms = (524288 - 1) - ty_xyz;
        entry.img.src = `https://assets.concept3d.com/assets/2329/2329_Map_2_6a7e2bd2bd4ad/19/${tx}/${ty_tms}`;
      } else {
        entry.failed = true;
      }
    };
    entry.img.src = `/api/maps/tiles/19/${tx}/${ty_xyz}`;
    this.tilesZ19.set(key, entry);
    return entry;
  }

  computeDrivableMask(img) {
    try {
      const ctx = this.offscreenCtx;
      ctx.clearRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const { data } = ctx.getImageData(0, 0, 512, 512);

      const mask = new Uint8Array(512 * 512);

      for (let i = 0; i < 512 * 512; i++) {
        const idx = i * 4;
        const a = data[idx + 3];
        if (a < 128) {
          mask[i] = 1;
          continue;
        }
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        const isGrass = (g > r + 15 && g > b + 15 && g >= 70);
        mask[i] = isGrass ? 0 : 1;
      }

      return mask;
    } catch {
      return null;
    }
  }

  countOffroadPoints(points) {
    if (!points || !Array.isArray(points)) return 0;
    let count = 0;
    for (const pt of points) {
      if (this.checkPixelCollisionTile(pt.x, pt.y)) {
        count++;
      }
    }
    return count;
  }

  isWorldPointDrivable(wx, wy) {
    if (!this.map) return true;

    if (this.map.lots) {
      for (const lot of this.map.lots) {
        if (lot.polygon && pointInPoly(wx, wy, lot.polygon)) {
          return true;
        }
      }
    }

    if (this.map.roads) {
      for (const road of this.map.roads) {
        const pts = road.points;
        if (!pts || pts.length < 2) continue;
        const roadW = (road.width || 48.0) / 2 + 8.0;
        for (let i = 0; i < pts.length - 1; i++) {
          const p1 = pts[i];
          const p2 = pts[i + 1];
          const l2 = (p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2;
          if (l2 === 0) continue;
          let t = ((wx - p1[0]) * (p2[0] - p1[0]) + (wy - p1[1]) * (p2[1] - p1[1])) / l2;
          t = Math.max(0, Math.min(1, t));
          const projX = p1[0] + t * (p2[0] - p1[0]);
          const projY = p1[1] + t * (p2[1] - p1[1]);
          if (Math.hypot(wx - projX, wy - projY) <= roadW) {
            return true;
          }
        }
      }
    }

    const originX = this.map.tile_origin_x || 130375;
    const originY = this.map.tile_origin_y || 215420;
    const tx = Math.floor(wx / 512) + originX;
    const ty = Math.floor(wy / 512) + originY;

    const tile = this.getOrLoadZ19Tile(tx, ty);
    if (!tile || !tile.loaded || !tile.mask) {
      return true;
    }

    const px = Math.floor(wx) - (tx - originX) * 512;
    const py = Math.floor(wy) - (ty - originY) * 512;
    if (px < 0 || px >= 512 || py < 0 || py >= 512) return true;

    return tile.mask[py * 512 + px] === 1;
  }

  checkTreeCollision(wx, wy, radius = 9.0) {
    return null;
  }

  checkFootprintCollision(perimeterPoints) {
    if (!this.map) return { collided: false };

    // 1. Building polygons (Tyler's addition)
    if (this.map.buildings) {
      for (const b of this.map.buildings) {
        if (b.polygon && b.polygon.length >= 3) {
          for (const pt of perimeterPoints) {
            if (pointInPoly(pt.x, pt.y, b.polygon)) {
              return { collided: true, reason: 'building', point: pt, buildingName: b.name };
            }
          }
        }
      }
    }

    // 2. Pixel collision mask checking (Your legacy logic)
    for (const pt of perimeterPoints) {
      if (this.checkPixelCollisionTile(pt.x, pt.y)) {
        return { collided: true, reason: 'curb_or_grass', point: pt };
      }
    }

    return { collided: false };
  }

  getOrLoadZ17CollisionTile(tx, ty) {
    const key = `17_${tx}_${ty}`;
    if (!this.collisionTileCache) this.collisionTileCache = {};

    if (this.collisionTileCache[key]) {
      return this.collisionTileCache[key];
    }

    const tileObj = { loaded: false, ctx: null };
    this.collisionTileCache[key] = tileObj;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `http://localhost:8000/api/maps/collision_tile/${key}.webp`;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      tileObj.ctx = ctx;
      tileObj.loaded = true;
      console.log(`[Collision Cache] Successfully loaded Z17: ${key}`);
    };

    img.onerror = () => {
      tileObj.loaded = true;
      tileObj.ctx = null;
      console.warn(`[Collision Cache] Missing Z17 tile image: ${key}`);
    };

    return tileObj;
  }

  checkPixelCollisionTile(worldX, worldY) {
    if (!this.map) return false;

    const tileSize = 512;
    const originX = (this.map.tile_origin_x || 130375) / 4;
    const originY = (this.map.tile_origin_y || 215420) / 4;

    const worldX_z17 = worldX / 4;
    const worldY_z17 = worldY / 4;

    const tileX = Math.floor(worldX_z17 / tileSize + originX);
    const tileY = Math.floor(worldY_z17 / tileSize + originY);

    const tile = this.getOrLoadZ17CollisionTile(tileX, tileY);
    if (!tile || !tile.loaded || !tile.ctx) {
      return false;
    }

    let px = Math.floor((worldX_z17 + originX * tileSize) % tileSize);
    let py = Math.floor((worldY_z17 + originY * tileSize) % tileSize);

    if (px < 0) px += tileSize;
    if (py < 0) py += tileSize;

    const sampleRadius = 2;
    const startX = Math.max(0, px - sampleRadius);
    const startY = Math.max(0, py - sampleRadius);
    const endX = Math.min(tileSize - 1, px + sampleRadius);
    const endY = Math.min(tileSize - 1, py + sampleRadius);

    const width = endX - startX + 1;
    const height = endY - startY + 1;

    const imgData = tile.ctx.getImageData(startX, startY, width, height).data;
    let solidRedCount = 0;

    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      const a = imgData[i + 3];

      if (a > 180 && r > 180 && g < 80 && b < 80) {
        solidRedCount++;
      }
    }

    return solidRedCount >= 8;
  }

  getObstacleCarOBBs(wx, wy, radius = 68) {
    const result = [];
    const rSq = radius * radius;
    for (const pc of this.occupiedStalls) {
      const dx = pc.cx - wx;
      const dy = pc.cy - wy;
      if (dx * dx + dy * dy <= rSq) {
        result.push(pc.obb);
      }
    }
    for (const tc of this.trafficCars) {
      const dx = tc.x - wx;
      const dy = tc.y - wy;
      if (dx * dx + dy * dy <= rSq) {
        result.push(buildOBB(tc.x, tc.y, (tc.heading * Math.PI) / 180, tc.length, tc.width, tc.id));
      }
    }
    return result;
  }

  triggerImpactEffect(x, y, obstacleId = null) {
    this.camera.shake = 7.0;
    if (obstacleId) {
      this.flashingCarId = obstacleId;
      this.flashTimer = 1.2;
    }
    for (let i = 0; i < 8; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 25 + Math.random() * 55;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.35 + Math.random() * 0.2
      });
    }
  }

  triggerTreeImpactEffect(x, y) {
    this.camera.shake = 8.0;
    for (let i = 0; i < 14; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 20 + Math.random() * 60;
      this.leaves.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 15,
        color: ['#4ade80', '#22c55e', '#15803d', '#854d0e'][Math.floor(Math.random() * 4)],
        size: 2.5 + Math.random() * 2.5,
        life: 0.55 + Math.random() * 0.3
      });
    }
    for (let i = 0; i < 6; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 15 + Math.random() * 35;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.25 + Math.random() * 0.2
      });
    }
  }

  updateEntities(dt, vehicle) {
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
      if (this.flashTimer === 0) this.flashingCarId = null;
    }

    if (this.camera.shake > 0) {
      this.camera.shake = Math.max(0, this.camera.shake - dt * 28);
    }

    this.updateTrafficCars(dt, vehicle);
    this.updatePedestrians(dt, vehicle);

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.life -= dt;
      if (sp.life <= 0) this.sparks.splice(i, 1);
    }

    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const lf = this.leaves[i];
      lf.x += lf.vx * dt;
      lf.y += lf.vy * dt;
      lf.vy += 45 * dt;
      lf.life -= dt;
      if (lf.life <= 0) this.leaves.splice(i, 1);
    }

    if (vehicle && (vehicle.isDrifting || (vehicle.isBraking && vehicle.getSpeedMph() > 12))) {
      this.tireTracks.push({
        x: vehicle.x,
        y: vehicle.y,
        angle: vehicle.angle,
        opacity: 0.45
      });
      if (this.tireTracks.length > 260) this.tireTracks.shift();
    }
  }

  updateTrafficCars(dt, vehicle) {
    for (const tc of this.trafficCars) {
      const radHeading = (tc.heading * Math.PI) / 180;
      const cosH = Math.cos(radHeading);
      const sinH = Math.sin(radHeading);

      let mustYield = false;
      if (vehicle) {
        const toPlayerX = vehicle.x - tc.x;
        const toPlayerY = vehicle.y - tc.y;
        const distToPlayer = Math.hypot(toPlayerX, toPlayerY);
        if (distToPlayer < 80) {
          const fwd = toPlayerX * cosH + toPlayerY * sinH;
          const lat = Math.abs(-toPlayerX * sinH + toPlayerY * cosH);
          if (fwd > 0 && fwd < 75 && lat < 22) {
            mustYield = true;
          }
        }
      }

      if (!mustYield) {
        for (const other of this.trafficCars) {
          if (other.id === tc.id) continue;
          const toOtherX = other.x - tc.x;
          const toOtherY = other.y - tc.y;
          const distToOther = Math.hypot(toOtherX, toOtherY);
          if (distToOther < 75) {
            const headingDiff = Math.abs(((other.heading - tc.heading) % 360 + 540) % 360 - 180);
            if (headingDiff > 75) continue;
            const fwd = toOtherX * cosH + toOtherY * sinH;
            const lat = Math.abs(-toOtherX * sinH + toOtherY * cosH);
            if (fwd > 0 && fwd < 68 && lat < 18) {
              mustYield = true;
              break;
            }
          }
        }
      }

      if (!mustYield) {
        for (const ped of this.pedestrians) {
          const toPedX = ped.x - tc.x;
          const toPedY = ped.y - tc.y;
          const distToPed = Math.hypot(toPedX, toPedY);
          if (distToPed < 60) {
            const fwd = toPedX * cosH + toPedY * sinH;
            const lat = Math.abs(-toPedX * sinH + toPedY * cosH);
            if (fwd > 0 && fwd < 55 && lat < 16) {
              mustYield = true;
              break;
            }
          }
        }
      }

      const ahead = samplePath(tc.path, tc.dist + 50);
      const turn = Math.abs(((ahead.angle - radHeading + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
      const cruiseSpeed = tc.targetSpeed * (1 - Math.min(0.55, turn * 0.6));

      if (mustYield) {
        tc.isBraking = true;
        tc.speed = Math.max(0, tc.speed - 150 * dt);
      } else if (tc.speed > cruiseSpeed) {
        tc.isBraking = true;
        tc.speed = Math.max(cruiseSpeed, tc.speed - 90 * dt);
      } else {
        tc.isBraking = false;
        tc.speed = Math.min(cruiseSpeed, tc.speed + 55 * dt);
      }

      tc.dist = (tc.dist + tc.speed * dt) % tc.path.total;
      placeOnPath(tc);
    }
  }

  updatePedestrians(dt, vehicle) {
    for (const ped of this.pedestrians) {
      let yieldToCar = false;
      if (vehicle) {
        const dist = Math.hypot(vehicle.x - ped.x, vehicle.y - ped.y);
        if (dist < 46 && vehicle.getSpeedMph() > 1.2) {
          yieldToCar = true;
        }
      }

      if (!yieldToCar) {
        const fwdX = Math.cos(ped.angle);
        const fwdY = Math.sin(ped.angle);
        const blockers = vehicle ? [vehicle, ...this.trafficCars] : this.trafficCars;
        for (const car of blockers) {
          const dx = car.x - ped.x;
          const dy = car.y - ped.y;
          const fwd = dx * fwdX + dy * fwdY;
          if (fwd > 0 && fwd < 30 && Math.abs(-dx * fwdY + dy * fwdX) < 20) {
            yieldToCar = true;
            break;
          }
        }
      }

      ped.isYielding = yieldToCar;
      if (yieldToCar) {
        continue;
      }

      if (ped.pause > 0) {
        ped.pause -= dt;
        continue;
      }

      ped.dist += ped.dir * ped.speed * dt;
      if (ped.dist >= ped.path.total || ped.dist <= 0) {
        ped.dist = Math.max(0, Math.min(ped.path.total, ped.dist));
        ped.dir = -ped.dir;
        ped.pause = 1.5 + Math.random() * 3.0;
      }

      const pos = samplePath(ped.path, ped.dist);
      ped.x = pos.x;
      ped.y = pos.y;
      ped.angle = ped.dir > 0 ? pos.angle : pos.angle + Math.PI;
      ped.walkPhase += dt * (ped.speed * 0.45);
    }
  }

  checkPedestrianCollision(v) {
    for (const ped of this.pedestrians) {
      const dist = Math.hypot(v.x - ped.x, v.y - ped.y);
      if (dist < 16.5) {
        return ped;
      }
    }
    return null;
  }

  render(map, vehicle, permitType, activeDestination, parkingProgress, eligibleStall) {
    const { ctx, canvas } = this;
    const width = canvas.width;
    const height = canvas.height;

    this.camera.x += (vehicle.x - this.camera.x) * 0.16;
    this.camera.y += (vehicle.y - this.camera.y) * 0.16;

    // Tyler's Rotating Camera Calculation
    if (this.camera.heading === null) {
      this.camera.heading = vehicle.angle;
    } else {
      const headingDiff = Math.atan2(Math.sin(vehicle.angle - this.camera.heading), Math.cos(vehicle.angle - this.camera.heading));
      this.camera.heading += headingDiff * 0.045;
    }
    this.camera.rotation = -Math.PI / 2 - this.camera.heading;
    this.camera.viewRadius = Math.hypot(width, height) / 2 / this.camera.zoom + 40;

    const shakeX = this.camera.shake > 0 ? (Math.random() - 0.5) * this.camera.shake : 0;
    const shakeY = this.camera.shake > 0 ? (Math.random() - 0.5) * this.camera.shake : 0;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    ctx.translate(width / 2 + shakeX, height / 2 + shakeY);
    ctx.rotate(this.camera.rotation);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    this.renderConcept3DTiles(map, width, height);
    this.renderTireTracks();

    if (map && map.lots) {
      this.renderStallsAndParkedCars(map.lots, vehicle, permitType, activeDestination, eligibleStall);
    }

    this.renderTrafficCars();
    this.renderPedestrians();

    if (map && map.buildings) {
      this.renderBuildingLabels(map.buildings, vehicle, activeDestination);
    }

    this.renderPlayerVehicle(vehicle, parkingProgress);
    this.renderSparks();
    this.renderLeaves();

    ctx.restore();
  }

  renderConcept3DTiles(map, viewWidth, viewHeight) {
    const ctx = this.ctx;
    const originX = map?.tile_origin_x || 130375;
    const originY = map?.tile_origin_y || 215420;
    const worldW = map?.width || 12288;
    const worldH = map?.height || 15872;

    ctx.fillStyle = COLORS.grassFallback;
    ctx.fillRect(-512, -512, worldW + 1024, worldH + 1024);

    const halfW = this.camera.viewRadius + 512;
    const halfH = this.camera.viewRadius + 512;

    const minWx = this.camera.x - halfW;
    const maxWx = this.camera.x + halfW;
    const minWy = this.camera.y - halfH;
    const maxWy = this.camera.y + halfH;

    const minTx17 = Math.floor((minWx / 512 + originX) / 4);
    const maxTx17 = Math.floor((maxWx / 512 + originX) / 4);
    const minTy17 = Math.floor((minWy / 512 + originY) / 4);
    const maxTy17 = Math.floor((maxWy / 512 + originY) / 4);

    for (let tx17 = minTx17; tx17 <= maxTx17; tx17++) {
      for (let ty17 = minTy17; ty17 <= maxTy17; ty17++) {
        const entry = this.getOrLoadZ17Tile(tx17, ty17);
        if (entry && entry.loaded) {
          const drawX = (tx17 * 4 - originX) * 512;
          const drawY = (ty17 * 4 - originY) * 512;
          ctx.drawImage(entry.img, drawX, drawY, 2048, 2048);
        }
      }
    }

    const minTx19 = Math.max(originX, Math.floor(minWx / 512) + originX);
    const maxTx19 = Math.min(originX + 24, Math.floor(maxWx / 512) + originX);
    const minTy19 = Math.max(originY, Math.floor(minWy / 512) + originY);
    const maxTy19 = Math.min(originY + 31, Math.floor(maxWy / 512) + originY);

    for (let tx = minTx19; tx <= maxTx19; tx++) {
      for (let ty = minTy19; ty <= maxTy19; ty++) {
        const entry = this.getOrLoadZ19Tile(tx, ty);
        if (entry && entry.loaded) {
          const drawX = (tx - originX) * 512;
          const drawY = (ty - originY) * 512;
          ctx.drawImage(entry.img, drawX, drawY, 512, 512);
        }
      }
    }

    if (this.showDebugOverlay) {
      for (let tx17 = minTx17; tx17 <= maxTx17; tx17++) {
        for (let ty17 = minTy17; ty17 <= maxTy17; ty17++) {
          const colTile = this.getOrLoadZ17CollisionTile(tx17, ty17);
          if (colTile && colTile.loaded && colTile.ctx) {
            const drawX = (tx17 * 4 - originX) * 512;
            const drawY = (ty17 * 4 - originY) * 512;

            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.drawImage(colTile.ctx.canvas, drawX, drawY, 2048, 2048);
            ctx.restore();
          }
        }
      }
    }
  }

  renderTireTracks() {
    const ctx = this.ctx;
    ctx.save();
    for (const t of this.tireTracks) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.angle);
      ctx.fillStyle = `rgba(15, 23, 42, ${t.opacity})`;
      ctx.fillRect(-8, -5.5, 6, 2);
      ctx.fillRect(-8, 3.5, 6, 2);
      ctx.restore();
      t.opacity = Math.max(0, t.opacity - 0.0008);
    }
    ctx.restore();
  }

  renderStallsAndParkedCars(lots, vehicle, permitType, activeDestination, eligibleStall) {
    const ctx = this.ctx;
    const targetLotIds = new Set(activeDestination?.target_lot_ids || []);

    for (const lot of lots) {
      if (!lot.stalls) continue;
      const isTargetLot = targetLotIds.size === 0 || targetLotIds.has(lot.id);

      for (const stall of lot.stalls) {
        const cx = stall.x;
        const cy = stall.y;

        if (Math.abs(cx - this.camera.x) > this.camera.viewRadius || Math.abs(cy - this.camera.y) > this.camera.viewRadius) {
          continue;
        }

        const isOccupied = this.occupiedStallIds.has(stall.id);
        if (isOccupied) continue;

        const dist = Math.hypot(vehicle.x - cx, vehicle.y - cy);
        const isEligibleTarget = eligibleStall && eligibleStall.id === stall.id;
        const isLegal = this.checkPermitAllowance(permitType, stall.stall_type);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(((stall.angle || 0) * Math.PI) / 180);

        const halfL = stall.height / 2;
        const halfW = stall.width / 2;

        const sType = (stall.stall_type || 'commuter').toLowerCase();
        const stallColor = PERMIT_COLORS[sType] || '#e3e12c';

        if (isLegal) {
          const strokeColor = isEligibleTarget
            ? '#FFC72C'
            : (isTargetLot ? stallColor : `${stallColor}CC`);
          const fillColor = isEligibleTarget
            ? 'rgba(255, 199, 44, 0.38)'
            : (isTargetLot ? `${stallColor}28` : `${stallColor}18`);

          ctx.fillStyle = fillColor;
          ctx.fillRect(-halfL, -halfW, stall.height, stall.width);

          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = isEligibleTarget ? 2.8 : 1.6;
          ctx.strokeRect(-halfL, -halfW, stall.height, stall.width);

          if (dist < 220 || isEligibleTarget) {
            ctx.fillStyle = isEligibleTarget ? '#FFC72C' : stallColor;
            ctx.beginPath();
            ctx.arc(0, 0, 3.0, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = `${stallColor}1F`;
          ctx.fillRect(-halfL, -halfW, stall.height, stall.width);

          ctx.strokeStyle = `${stallColor}B8`;
          ctx.lineWidth = 1.4;
          ctx.strokeRect(-halfL, -halfW, stall.height, stall.width);

          ctx.fillStyle = stallColor;
          ctx.beginPath();
          ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    for (const pc of this.occupiedStalls) {
      if (Math.abs(pc.cx - this.camera.x) > this.camera.viewRadius || Math.abs(pc.cy - this.camera.y) > this.camera.viewRadius) {
        continue;
      }
      ctx.save();
      ctx.translate(pc.cx, pc.cy);
      ctx.rotate(pc.angleRad);
      const isFlashing = this.flashingCarId === pc.id && Math.floor(this.flashTimer * 12) % 2 === 0;
      this.drawParkedCar(ctx, pc.length, pc.width, pc.color, isFlashing);
      ctx.restore();
    }
  }

  checkPermitAllowance(permit, stallType) {
    if (!permit) return false;
    const p = permit.toLowerCase();
    const s = (stallType || 'commuter').toLowerCase();
    if (p === 'faculty') return true;
    if (p === 'upperclass' && (s === 'upperclass' || s === 'freshman' || s === 'commuter' || s === 'visitor')) return true;
    if (p === 'freshman' && (s === 'freshman' || s === 'commuter' || s === 'visitor')) return true;
    if (p === 'resident' && (s === 'resident' || s === 'visitor')) return true;
    return p === s;
  }

  drawParkedCar(ctx, length, width, color, flashHazards = false) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.roundRect(-length / 2 + 2, -width / 2 + 2, length, width, 3.5);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-length / 2, -width / 2, length, width, 3.5);
    ctx.fill();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.beginPath();
    ctx.roundRect(-length * 0.28, -width * 0.38, length * 0.56, width * 0.76, 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.fillRect(-length * 0.14, -width * 0.32, length * 0.28, width * 0.64);

    if (flashHazards) {
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(length / 2 - 2.5, -width / 2 + 1, 2.5, 3);
      ctx.fillRect(length / 2 - 2.5, width / 2 - 4, 2.5, 3);
      ctx.fillRect(-length / 2, -width / 2 + 1, 2.5, 3);
      ctx.fillRect(-length / 2, width / 2 - 4, 2.5, 3);
    }
  }

  renderTrafficCars() {
    const ctx = this.ctx;
    for (const tc of this.trafficCars) {
      if (Math.abs(tc.x - this.camera.x) > this.camera.viewRadius || Math.abs(tc.y - this.camera.y) > this.camera.viewRadius) {
        continue;
      }
      ctx.save();
      ctx.translate(tc.x, tc.y);
      ctx.rotate((tc.heading * Math.PI) / 180);

      const beamGrad = ctx.createRadialGradient(tc.length / 2, 0, 4, tc.length / 2 + 50, 0, 55);
      beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.16)');
      beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(tc.length / 2, -tc.width / 2);
      ctx.lineTo(tc.length / 2 + 50, -tc.width * 1.5);
      ctx.lineTo(tc.length / 2 + 50, tc.width * 1.5);
      ctx.lineTo(tc.length / 2, tc.width / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.beginPath();
      ctx.roundRect(-tc.length / 2 + 2, -tc.width / 2 + 2, tc.length, tc.width, 3.5);
      ctx.fill();

      ctx.fillStyle = tc.color;
      ctx.beginPath();
      ctx.roundRect(-tc.length / 2, -tc.width / 2, tc.length, tc.width, 3.5);
      ctx.fill();

      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.beginPath();
      ctx.roundRect(-tc.length * 0.28, -tc.width * 0.38, tc.length * 0.56, tc.width * 0.76, 2);
      ctx.fill();

      ctx.fillStyle = tc.color;
      ctx.fillRect(-tc.length * 0.14, -tc.width * 0.32, tc.length * 0.28, tc.width * 0.64);

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(tc.length / 2 - 2, -tc.width / 2 + 1.2, 2, 2.8);
      ctx.fillRect(tc.length / 2 - 2, tc.width / 2 - 4.0, 2, 2.8);

      if (tc.isBraking) {
        ctx.fillStyle = '#ff1a1a';
        ctx.fillRect(-tc.length / 2 - 0.8, -tc.width / 2 + 1.2, 2.2, 3.2);
        ctx.fillRect(-tc.length / 2 - 0.8, tc.width / 2 - 4.4, 2.2, 3.2);
      } else {
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(-tc.length / 2 - 0.5, -tc.width / 2 + 1.2, 1.8, 2.5);
        ctx.fillRect(-tc.length / 2 - 0.5, tc.width / 2 - 3.7, 1.8, 2.5);
      }

      ctx.restore();
    }
  }

  renderPedestrians() {
    const ctx = this.ctx;
    for (const ped of this.pedestrians) {
      if (Math.abs(ped.x - this.camera.x) > this.camera.viewRadius || Math.abs(ped.y - this.camera.y) > this.camera.viewRadius) {
        continue;
      }
      ctx.save();
      ctx.translate(ped.x, ped.y);
      ctx.rotate(ped.angle);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.beginPath();
      ctx.ellipse(0, 1, 4.5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      const swing = Math.sin(ped.walkPhase) * 2.8;

      ctx.fillStyle = ped.pantsColor;
      ctx.fillRect(-2 + swing, -3.2, 3.8, 2);
      ctx.fillRect(-2 - swing, 1.2, 3.8, 2);

      ctx.fillStyle = ped.shirtColor;
      ctx.beginPath();
      ctx.roundRect(-2.8, -3.8, 5.6, 7.6, 2);
      ctx.fill();

      ctx.fillStyle = ped.backpackColor;
      ctx.beginPath();
      ctx.roundRect(-4.8, -2.5, 2.6, 5.0, 1.2);
      ctx.fill();

      ctx.fillStyle = ped.skinColor;
      ctx.beginPath();
      ctx.arc(0.5, 0, 2.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ped.hairColor;
      ctx.beginPath();
      ctx.arc(-0.2, 0, 2.4, Math.PI * 0.4, Math.PI * 1.6);
      ctx.fill();

      if (ped.isYielding) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, -6.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 3.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, -6.5);
      }

      ctx.restore();
    }
  }

  renderBuildingLabels(buildings, vehicle, activeDestination) {
    const ctx = this.ctx;
    for (const b of buildings) {
      const [x, y, w, h] = b.rect;
      const cx = x + w / 2;
      const cy = y + h / 2;
      const isTarget = activeDestination && activeDestination.building_id === b.id;
      const dist = Math.hypot(cx - vehicle.x, cy - vehicle.y);

      if (!isTarget && dist > 600) continue;

      ctx.save();
      // Keep labels upright on screen regardless of camera rotation
      ctx.translate(cx, cy);
      ctx.rotate(-this.camera.rotation);
      ctx.translate(-cx, -cy);

      if (isTarget) {
        const pulse = (Math.sin(Date.now() / 220) + 1) / 2;
        ctx.strokeStyle = COLORS.seluGold;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 24 + pulse * 14, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 87, 61, 0.92)';
        ctx.strokeStyle = COLORS.seluGold;
        ctx.lineWidth = 1.5;
        const labelText = `★ ${b.label || b.name}`;
        ctx.font = '700 10px Chakra Petch, sans-serif';
        const tw = ctx.measureText(labelText).width + 14;
        ctx.beginPath();
        ctx.roundRect(cx - tw / 2, cy - 11, tw, 22, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = COLORS.seluGold;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, cx, cy);
      } else {
        ctx.font = '600 8.5px Inter, sans-serif';
        const labelText = b.label || b.name;
        const tw = ctx.measureText(labelText).width + 10;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.beginPath();
        ctx.roundRect(cx - tw / 2, cy - 8, tw, 16, 4);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, cx, cy);
      }
      ctx.restore();
    }
  }

  renderPlayerVehicle(v, parkingProgress) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle);

    const beamGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, 95);
    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
    beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(v.length / 2, -v.width / 2);
    ctx.lineTo(v.length / 2 + 85, -v.width * 1.9);
    ctx.lineTo(v.length / 2 + 85, v.width * 1.9);
    ctx.lineTo(v.length / 2, v.width / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    ctx.roundRect(-v.length / 2 + 2.5, -v.width / 2 + 2.5, v.length, v.width, 4);
    ctx.fill();

    ctx.fillStyle = COLORS.seluGreen;
    ctx.beginPath();
    ctx.roundRect(-v.length / 2, -v.width / 2, v.length, v.width, 4);
    ctx.fill();

    ctx.strokeStyle = COLORS.seluGold;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    ctx.fillStyle = COLORS.seluGold;
    ctx.fillRect(-v.length / 2 + 1.5, -2.1, v.length - 3, 1.3);
    ctx.fillRect(-v.length / 2 + 1.5, 0.8, v.length - 3, 1.3);

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-v.length * 0.25, -v.width * 0.39, v.length * 0.5, v.width * 0.78, 2);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(v.length * 0.08, -v.width * 0.33, 3, v.width * 0.66);

    ctx.fillStyle = '#020617';
    ctx.fillRect(-v.length * 0.35, -v.width / 2 - 1.2, 6, 2);
    ctx.fillRect(-v.length * 0.35, v.width / 2 - 0.8, 6, 2);

    ctx.save();
    ctx.translate(v.length * 0.3, -v.width / 2);
    ctx.rotate(v.steerAngle);
    ctx.fillRect(-3, -1.2, 6, 2);
    ctx.restore();

    ctx.save();
    ctx.translate(v.length * 0.3, v.width / 2);
    ctx.rotate(v.steerAngle);
    ctx.fillRect(-3, -0.8, 6, 2);
    ctx.restore();

    if (v.isBraking) {
      ctx.fillStyle = '#ff1a1a';
      ctx.fillRect(-v.length / 2 - 0.8, -v.width / 2 + 1.5, 2, 3.2);
      ctx.fillRect(-v.length / 2 - 0.8, v.width / 2 - 4.7, 2, 3.2);
    } else if (v.gear === 'R') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-v.length / 2 - 0.8, -v.width / 2 + 1.5, 2, 3.2);
      ctx.fillRect(-v.length / 2 - 0.8, v.width / 2 - 4.7, 2, 3.2);
    }

    if (parkingProgress > 0) {
      ctx.save();
      ctx.rotate(-v.angle - this.camera.rotation);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = COLORS.seluGold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 20, -Math.PI / 2, -Math.PI / 2 + parkingProgress * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  renderSparks() {
    const ctx = this.ctx;
    ctx.save();
    for (const sp of this.sparks) {
      ctx.fillStyle = '#FFC72C';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderLeaves() {
    const ctx = this.ctx;
    ctx.save();
    for (const lf of this.leaves) {
      ctx.fillStyle = lf.color;
      ctx.beginPath();
      ctx.arc(lf.x, lf.y, lf.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}