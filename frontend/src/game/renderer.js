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
  freshman: '#8B4513',   // Brown
  upperclass: '#D4A017', // Golden / Dark Yellow
  faculty: '#DC2626',    // Red
  resident: '#721226',   // Dark Burgundy
  commuter: '#D4A017',
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

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = { x: 9248.7, y: 9788.8, zoom: 1.65, shake: 0 };
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

    // Populate spatial hash grid for trees (128px cells)
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

    // Initialize Campus AI Traffic Cars (Waypoint-based road lanes)
    this.trafficCars = [];
    const trafficCorridors = [
      // 1. North Oak Street Southbound (UC / North Campus to South Campus)
      {
        id: 'oak_sb_1',
        routeId: 'oak_sb',
        speed: 78,
        color: '#e2e8f0',
        waypoints: [
          { x: 8320, y: 6600 },
          { x: 8325, y: 8500 },
          { x: 8345, y: 10500 },
          { x: 8345, y: 12500 },
          { x: 8320, y: 14400 }
        ],
        startProg: 0.12
      },
      {
        id: 'oak_sb_2',
        routeId: 'oak_sb',
        speed: 82,
        color: '#1e293b',
        waypoints: [
          { x: 8320, y: 6600 },
          { x: 8325, y: 8500 },
          { x: 8345, y: 10500 },
          { x: 8345, y: 12500 },
          { x: 8320, y: 14400 }
        ],
        startProg: 0.58
      },
      // 2. North Oak Street Northbound (South Campus to UC)
      {
        id: 'oak_nb_1',
        routeId: 'oak_nb',
        speed: 80,
        color: '#dc2626',
        waypoints: [
          { x: 8350, y: 14400 },
          { x: 8350, y: 12500 },
          { x: 8350, y: 10500 },
          { x: 8330, y: 8500 },
          { x: 8325, y: 6600 }
        ],
        startProg: 0.18
      },
      {
        id: 'oak_nb_2',
        routeId: 'oak_nb',
        speed: 76,
        color: '#94a3b8',
        waypoints: [
          { x: 8350, y: 14400 },
          { x: 8350, y: 12500 },
          { x: 8350, y: 10500 },
          { x: 8330, y: 8500 },
          { x: 8325, y: 6600 }
        ],
        startProg: 0.68
      },
      // 3. SGA Drive Eastbound (University Center towards North Oak Street)
      {
        id: 'sga_eb_1',
        routeId: 'sga_eb',
        speed: 75,
        color: '#f8fafc',
        waypoints: [
          { x: 3600, y: 6515 },
          { x: 5500, y: 6515 },
          { x: 8180, y: 6515 }
        ],
        startProg: 0.35
      },
      // 4. SGA Drive Westbound (North Oak Street towards University Center)
      {
        id: 'sga_wb_1',
        routeId: 'sga_wb',
        speed: 78,
        color: '#b45309',
        waypoints: [
          { x: 8180, y: 6485 },
          { x: 5500, y: 6485 },
          { x: 3600, y: 6485 }
        ],
        startProg: 0.45
      },
      // 5. West Dakota Street Eastbound (Pershing towards North Oak Street)
      {
        id: 'dak_eb_1',
        routeId: 'dak_eb',
        speed: 76,
        color: '#475569',
        waypoints: [
          { x: 6400, y: 10815 },
          { x: 8220, y: 10815 }
        ],
        startProg: 0.25
      },
      // 6. West Dakota Street Westbound (North Oak Street towards Pershing)
      {
        id: 'dak_wb_1',
        routeId: 'dak_wb',
        speed: 80,
        color: '#15803d',
        waypoints: [
          { x: 8220, y: 10785 },
          { x: 6400, y: 10785 }
        ],
        startProg: 0.6
      },
      // 7. North Campus / Lion Lane Southbound
      {
        id: 'lion_sb_1',
        routeId: 'lion_sb',
        speed: 72,
        color: '#d97706',
        waypoints: [
          { x: 3192, y: 3600 },
          { x: 3192, y: 5800 }
        ],
        startProg: 0.3
      },
      // 8. North Campus / Lion Lane Northbound
      {
        id: 'lion_nb_1',
        routeId: 'lion_nb',
        speed: 74,
        color: '#64748b',
        waypoints: [
          { x: 3216, y: 5800 },
          { x: 3216, y: 3600 }
        ],
        startProg: 0.75
      }
    ];

    for (const r of trafficCorridors) {
      const wps = r.waypoints;
      const numSegments = wps.length - 1;
      const segFloat = r.startProg * numSegments;
      const segIdx = Math.min(numSegments - 1, Math.floor(segFloat));
      const segT = segFloat - segIdx;
      const p1 = wps[segIdx];
      const p2 = wps[segIdx + 1];
      const startX = p1.x + (p2.x - p1.x) * segT;
      const startY = p1.y + (p2.y - p1.y) * segT;
      const headingDeg = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;

      const tc = {
        id: r.id,
        routeId: r.routeId,
        x: startX,
        y: startY,
        waypoints: wps,
        targetIdx: segIdx + 1,
        heading: headingDeg,
        speed: r.speed,
        targetSpeed: r.speed,
        length: 29.0,
        width: 14.0,
        color: r.color,
        isBraking: false,
        obb: buildOBB(startX, startY, (headingDeg * Math.PI) / 180, 29.0, 14.0, r.id)
      };
      this.trafficCars.push(tc);
    }

    // Initialize Campus Student Pedestrians
    this.pedestrians = [];
    const pedDefs = [
      // Fayard Hall Crosswalk across North Oak Street
      { x1: 8200, y1: 9810, x2: 8275, y2: 9810, speed: 22, shirt: '#00573D' },
      { x1: 8275, y1: 9825, x2: 8200, y2: 9825, speed: 20, shirt: '#FFC72C' },
      // Student Union Crosswalk across North Oak Street
      { x1: 8200, y1: 10940, x2: 8280, y2: 10940, speed: 24, shirt: '#f8fafc' },
      { x1: 8280, y1: 10960, x2: 8200, y2: 10960, speed: 21, shirt: '#1e3a8a' },
      // Campbell / Pottle Hall Crosswalk
      { x1: 8200, y1: 11950, x2: 8280, y2: 11950, speed: 23, shirt: '#00573D' },
      // Fayard Hall Quad Walkway
      { x1: 8850, y1: 10250, x2: 9150, y2: 10250, speed: 25, shirt: '#dc2626' },
      { x1: 9100, y1: 10270, x2: 8870, y2: 10270, speed: 22, shirt: '#FFC72C' },
      // Anzalone to Fayard Breezeway
      { x1: 8850, y1: 9700, x2: 8850, y2: 10100, speed: 26, shirt: '#00573D' },
      { x1: 8870, y1: 10080, x2: 8870, y2: 9720, speed: 24, shirt: '#475569' },
      // Student Union Plaza
      { x1: 8180, y1: 11120, x2: 8450, y2: 11120, speed: 22, shirt: '#FFC72C' },
      { x1: 8420, y1: 11150, x2: 8200, y2: 11150, speed: 23, shirt: '#00573D' },
      // Sims Memorial Library Entrance
      { x1: 7420, y1: 10560, x2: 7680, y2: 10560, speed: 20, shirt: '#2563eb' },
      // SGA Drive UC Crosswalk
      { x1: 4216, y1: 6465, x2: 4216, y2: 6535, speed: 22, shirt: '#166534' }
    ];

    const hairColors = ['#451a03', '#78350f', '#0f172a', '#fbbf24', '#171717'];
    const skinColors = ['#fcd34d', '#fed7aa', '#fbcfe8', '#d97706', '#92400e'];
    const pantsColors = ['#1e293b', '#2563eb', '#334155', '#475569'];
    const backpackColors = ['#00573D', '#0f172a', '#b45309', '#1e3a8a'];

    pedDefs.forEach((p, idx) => {
      this.pedestrians.push({
        id: `ped_${idx}`,
        x: p.x1,
        y: p.y1,
        x1: p.x1,
        y1: p.y1,
        x2: p.x2,
        y2: p.y2,
        target: 2,
        speed: p.speed,
        angle: Math.atan2(p.y2 - p.y1, p.x2 - p.x1),
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

        // Green lawn grass / landscaping check:
        // Genuine lawn grass in Concept3D has dominant green saturation:
        // g > r + 15 && g > b + 15 && g >= 70
        const isGrass = (g > r + 15 && g > b + 15 && g >= 70);

        // If it's grass, it's non-drivable off-road (mask = 0).
        // Otherwise it's roadway asphalt, concrete, painted lines, street text ("N OAK ST"),
        // crosswalks, or stall markings, which are 100% drivable (mask = 1)!
        mask[i] = isGrass ? 0 : 1;
      }

      return mask;
    } catch {
      return null;
    }
  }

  isWorldPointDrivable(wx, wy) {
    if (!this.map) return true;

    // 1. All designated campus parking lots are 100% drivable paved asphalt!
    if (this.map.lots) {
      for (const lot of this.map.lots) {
        if (lot.polygon && pointInPoly(wx, wy, lot.polygon)) {
          return true;
        }
      }
    }

    // 2. All designated campus road corridors are 100% drivable!
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

    // 3. Pixel surface mask (detects actual green lawn grass & offroad soil)
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
    // Trees reside exclusively on campus grass landscaping; off-road driving is handled strictly via grass collision
    return null;
  }

  checkFootprintCollision(perimeterPoints) {
    if (!this.map) return { collided: false };

    // 1. Building polygons
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

    // 2. Pixel surface mask (blocks grass, curbs, islands, sidewalks)
    for (const pt of perimeterPoints) {
      if (!this.isWorldPointDrivable(pt.x, pt.y)) {
        return { collided: true, reason: 'curb_or_grass', point: pt };
      }
    }

    return { collided: false };
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
    // Spawns fluttering green leaves and bark fragments
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

    // Update Campus AI Traffic Cars & Student Pedestrians
    this.updateTrafficCars(dt, vehicle);
    this.updatePedestrians(dt, vehicle);

    // Update collision sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.life -= dt;
      if (sp.life <= 0) this.sparks.splice(i, 1);
    }

    // Update tree leaves
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const lf = this.leaves[i];
      lf.x += lf.vx * dt;
      lf.y += lf.vy * dt;
      lf.vy += 45 * dt; // gravity
      lf.life -= dt;
      if (lf.life <= 0) this.leaves.splice(i, 1);
    }

    // Tire tracks
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
      if (!tc.waypoints || tc.waypoints.length < 2) continue;

      const radHeading = (tc.heading * Math.PI) / 180;
      const cosH = Math.cos(radHeading);
      const sinH = Math.sin(radHeading);

      // 1. Check distance to player vehicle ahead in driving lane
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

      // 2. Check distance to other traffic cars ahead in lane
      if (!mustYield) {
        for (const other of this.trafficCars) {
          if (other.id === tc.id) continue;
          const toOtherX = other.x - tc.x;
          const toOtherY = other.y - tc.y;
          const distToOther = Math.hypot(toOtherX, toOtherY);
          if (distToOther < 75) {
            const fwd = toOtherX * cosH + toOtherY * sinH;
            const lat = Math.abs(-toOtherX * sinH + toOtherY * cosH);
            if (fwd > 0 && fwd < 68 && lat < 18) {
              mustYield = true;
              break;
            }
          }
        }
      }

      // 3. Check distance to pedestrians crossing ahead
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

      // Speed control & braking
      if (mustYield) {
        tc.isBraking = true;
        tc.speed = Math.max(0, tc.speed - 150 * dt);
      } else {
        tc.isBraking = false;
        if (tc.speed < tc.targetSpeed) {
          tc.speed = Math.min(tc.targetSpeed, tc.speed + 55 * dt);
        }
      }

      // Steer toward current target waypoint
      const targetPt = tc.waypoints[tc.targetIdx];
      const dx = targetPt.x - tc.x;
      const dy = targetPt.y - tc.y;
      const distToWp = Math.hypot(dx, dy);

      const targetDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      let diffH = ((targetDeg - tc.heading) % 360 + 540) % 360 - 180;
      tc.heading += diffH * Math.min(1.0, dt * 10.0);

      const moveRad = (tc.heading * Math.PI) / 180;
      tc.x += Math.cos(moveRad) * tc.speed * dt;
      tc.y += Math.sin(moveRad) * tc.speed * dt;

      // Advance waypoint index or loop around when reaching corridor end
      if (distToWp < 25) {
        tc.targetIdx++;
        if (tc.targetIdx >= tc.waypoints.length) {
          tc.targetIdx = 1;
          tc.x = tc.waypoints[0].x;
          tc.y = tc.waypoints[0].y;
          const nextDx = tc.waypoints[1].x - tc.x;
          const nextDy = tc.waypoints[1].y - tc.y;
          tc.heading = (Math.atan2(nextDy, nextDx) * 180) / Math.PI;
        }
      }

      // Update oriented bounding box for collision detection
      tc.obb = buildOBB(tc.x, tc.y, (tc.heading * Math.PI) / 180, tc.length, tc.width, tc.id);
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

      ped.isYielding = yieldToCar;
      if (yieldToCar) {
        continue;
      }

      const targetX = ped.target === 2 ? ped.x2 : ped.x1;
      const targetY = ped.target === 2 ? ped.y2 : ped.y1;
      const distToTarget = Math.hypot(targetX - ped.x, targetY - ped.y);

      if (distToTarget < 5.0) {
        ped.target = ped.target === 2 ? 1 : 2;
        const nextX = ped.target === 2 ? ped.x2 : ped.x1;
        const nextY = ped.target === 2 ? ped.y2 : ped.y1;
        ped.angle = Math.atan2(nextY - ped.y, nextX - ped.x);
      } else {
        ped.angle = Math.atan2(targetY - ped.y, targetX - ped.x);
        ped.x += Math.cos(ped.angle) * ped.speed * dt;
        ped.y += Math.sin(ped.angle) * ped.speed * dt;
        ped.walkPhase += dt * (ped.speed * 0.45);
      }
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

    const shakeX = this.camera.shake > 0 ? (Math.random() - 0.5) * this.camera.shake : 0;
    const shakeY = this.camera.shake > 0 ? (Math.random() - 0.5) * this.camera.shake : 0;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    ctx.translate(width / 2 + shakeX, height / 2 + shakeY);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // 1. Concept3D Tiles (Zoom 17 base + Zoom 19 ultra-HD)
    this.renderConcept3DTiles(map, width, height);

    // 2. Tire Marks
    this.renderTireTracks();

    // 3. Dynamic Permit Highlights & Solid Parked Cars
    if (map && map.lots) {
      this.renderStallsAndParkedCars(map.lots, vehicle, permitType, activeDestination, eligibleStall);
    }

    // 4. Campus AI Traffic Cars & Student Pedestrians
    this.renderTrafficCars();
    this.renderPedestrians();

    // 5. Floating Building Landmark Labels & Destination Beacon
    if (map && map.buildings) {
      this.renderBuildingLabels(map.buildings, vehicle, activeDestination);
    }

    // 6. Player Vehicle
    this.renderPlayerVehicle(vehicle, parkingProgress);

    // 7. Impact Sparks & Leaves
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

    const halfW = (viewWidth / 2) / this.camera.zoom + 512;
    const halfH = (viewHeight / 2) / this.camera.zoom + 512;

    const minWx = this.camera.x - halfW;
    const maxWx = this.camera.x + halfW;
    const minWy = this.camera.y - halfH;
    const maxWy = this.camera.y + halfH;

    // Zoom 17 overview
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

    // Zoom 19 native tiles
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

    // 1. Dynamic Highlights on Open Stalls near the Player
    for (const lot of lots) {
      if (!lot.stalls) continue;
      const isTargetLot = targetLotIds.size === 0 || targetLotIds.has(lot.id);

      for (const stall of lot.stalls) {
        // stall.x and stall.y are the true center coordinates!
        const cx = stall.x;
        const cy = stall.y;

        if (Math.abs(cx - this.camera.x) > 750 || Math.abs(cy - this.camera.y) > 550) {
          continue;
        }

        const isOccupied = this.occupiedStallIds.has(stall.id);
        if (isOccupied) continue;

        const dist = Math.hypot(vehicle.x - cx, vehicle.y - cy);
        const isEligibleTarget = eligibleStall && eligibleStall.id === stall.id;
        const isLegal = this.checkPermitAllowance(permitType, stall.stall_type);

        ctx.save();
        ctx.translate(cx, cy);
        // stall.angle is the longitudinal axis (along divider lines)
        ctx.rotate(((stall.angle || 0) * Math.PI) / 180);

        const halfL = stall.height / 2;
        const halfW = stall.width / 2;

        const sType = (stall.stall_type || 'commuter').toLowerCase();
        const stallColor = PERMIT_COLORS[sType] || '#D4A017';

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
          // Restricted stall for player's current permit: always visible on screen in its permit color
          ctx.fillStyle = `${stallColor}1F`;
          ctx.fillRect(-halfL, -halfW, stall.height, stall.width);

          ctx.strokeStyle = `${stallColor}B8`;
          ctx.lineWidth = 1.4;
          ctx.strokeRect(-halfL, -halfW, stall.height, stall.width);

          // Tag dot indicating the restricted stall type (Red for faculty, Burgundy for resident, etc.)
          ctx.fillStyle = stallColor;
          ctx.beginPath();
          ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    // 2. Solid Parked Vehicles (cleanly fitting between painted lines!)
    for (const pc of this.occupiedStalls) {
      if (Math.abs(pc.cx - this.camera.x) > 750 || Math.abs(pc.cy - this.camera.y) > 550) {
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
      if (Math.abs(tc.x - this.camera.x) > 750 || Math.abs(tc.y - this.camera.y) > 550) {
        continue;
      }
      ctx.save();
      ctx.translate(tc.x, tc.y);
      ctx.rotate((tc.heading * Math.PI) / 180);

      // Subtle headlight beam
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

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.beginPath();
      ctx.roundRect(-tc.length / 2 + 2, -tc.width / 2 + 2, tc.length, tc.width, 3.5);
      ctx.fill();

      // Car body
      ctx.fillStyle = tc.color;
      ctx.beginPath();
      ctx.roundRect(-tc.length / 2, -tc.width / 2, tc.length, tc.width, 3.5);
      ctx.fill();

      // Windshield & Cabin Glass
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.beginPath();
      ctx.roundRect(-tc.length * 0.28, -tc.width * 0.38, tc.length * 0.56, tc.width * 0.76, 2);
      ctx.fill();

      // Roof color insert
      ctx.fillStyle = tc.color;
      ctx.fillRect(-tc.length * 0.14, -tc.width * 0.32, tc.length * 0.28, tc.width * 0.64);

      // Front headlights
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(tc.length / 2 - 2, -tc.width / 2 + 1.2, 2, 2.8);
      ctx.fillRect(tc.length / 2 - 2, tc.width / 2 - 4.0, 2, 2.8);

      // Rear taillights
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
      if (Math.abs(ped.x - this.camera.x) > 700 || Math.abs(ped.y - this.camera.y) > 500) {
        continue;
      }
      ctx.save();
      ctx.translate(ped.x, ped.y);
      ctx.rotate(ped.angle);

      // Subtle drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.beginPath();
      ctx.ellipse(0, 1, 4.5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      const swing = Math.sin(ped.walkPhase) * 2.8;

      // Animated Feet / Legs
      ctx.fillStyle = ped.pantsColor;
      ctx.fillRect(-2 + swing, -3.2, 3.8, 2);
      ctx.fillRect(-2 - swing, 1.2, 3.8, 2);

      // Student Torso / T-Shirt
      ctx.fillStyle = ped.shirtColor;
      ctx.beginPath();
      ctx.roundRect(-2.8, -3.8, 5.6, 7.6, 2);
      ctx.fill();

      // Backpack
      ctx.fillStyle = ped.backpackColor;
      ctx.beginPath();
      ctx.roundRect(-4.8, -2.5, 2.6, 5.0, 1.2);
      ctx.fill();

      // Head
      ctx.fillStyle = ped.skinColor;
      ctx.beginPath();
      ctx.arc(0.5, 0, 2.6, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = ped.hairColor;
      ctx.beginPath();
      ctx.arc(-0.2, 0, 2.4, Math.PI * 0.4, Math.PI * 1.6);
      ctx.fill();

      // Alert badge if yielding
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
      ctx.rotate(-v.angle);
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
