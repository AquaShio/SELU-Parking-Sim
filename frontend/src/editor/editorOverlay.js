// Draws the editable map layers in world space. The caller has already applied the camera transform.
import { LOT_COLORS, STALL_W, STALL_L, stallCorners, rectToPoly } from './editorState';

const ZONE_STYLE = {
  grass: { fill: 'rgba(34, 197, 94, 0.28)', stroke: '#16a34a' },
  solid: { fill: 'rgba(239, 68, 68, 0.32)', stroke: '#dc2626' }
};
const SELECT = '#FFC72C';

function tracePoly(ctx, pts, close = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
  if (close) ctx.closePath();
}

function inView(pts, view) {
  for (const [x, y] of pts) {
    if (x > view.minX && x < view.maxX && y > view.minY && y < view.maxY) return true;
  }
  // Big shapes can surround the view without a vertex inside it
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x; if (y < minY) minY = y;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y;
  }
  return !(maxX < view.minX || minX > view.maxX || maxY < view.minY || minY > view.maxY);
}

function isSel(ed, kind, i, j) {
  const s = ed.selection;
  return s && s.kind === kind && s.i === i && (j === undefined || s.j === j);
}

export function drawEditorOverlay(ctx, ed, view) {
  const m = ed.map, L = ed.layers, z = ed.cam.zoom;
  const px = (n) => n / z; // screen pixels -> world units

  // Zones
  if (L.zones) {
    m.zones.forEach((zone, i) => {
      if (!inView(zone.polygon, view)) return;
      const st = ZONE_STYLE[zone.type] || ZONE_STYLE.solid;
      tracePoly(ctx, zone.polygon);
      ctx.fillStyle = st.fill;
      ctx.fill();
      ctx.lineWidth = px(isSel(ed, 'zone', i) ? 3 : 1.5);
      ctx.strokeStyle = isSel(ed, 'zone', i) ? SELECT : st.stroke;
      ctx.stroke();
    });
  }

  // Lots + stalls
  if (L.lots) {
    m.lots.forEach((lot, i) => {
      if (!lot.polygon || lot.polygon.length < 3 || !inView(lot.polygon, view)) return;
      const color = lot.color || LOT_COLORS[lot.lot_type] || '#00573D';
      tracePoly(ctx, lot.polygon);
      ctx.fillStyle = color + '22';
      ctx.fill();
      ctx.setLineDash([px(6), px(4)]);
      ctx.lineWidth = px(isSel(ed, 'lot', i) ? 3 : 1.5);
      ctx.strokeStyle = isSel(ed, 'lot', i) ? SELECT : color;
      ctx.stroke();
      ctx.setLineDash([]);

      if (L.stalls && z > 0.35) {
        (lot.stalls || []).forEach((s, j) => {
          if (s.x < view.minX - 30 || s.x > view.maxX + 30 || s.y < view.minY - 30 || s.y > view.maxY + 30) return;
          const c = stallCorners(s);
          tracePoly(ctx, c);
          const sc = LOT_COLORS[s.stall_type] || color;
          ctx.fillStyle = sc + '40';
          ctx.fill();
          ctx.lineWidth = px(isSel(ed, 'stall', i, j) ? 2.5 : 1);
          ctx.strokeStyle = isSel(ed, 'stall', i, j) ? SELECT : sc;
          ctx.stroke();
        });
      }
    });
  }

  // Buildings: traced outlines solid, rect-only buildings dashed (their box is only an estimate)
  if (L.buildings) {
    m.buildings.forEach((b, i) => {
      const hasPoly = b.polygon && b.polygon.length >= 3;
      const poly = hasPoly ? b.polygon : rectToPoly(b.rect);
      if (!inView(poly, view)) return;
      tracePoly(ctx, poly);
      ctx.fillStyle = 'rgba(51, 65, 85, 0.35)';
      ctx.fill();
      if (!hasPoly) ctx.setLineDash([px(4), px(3)]);
      ctx.lineWidth = px(isSel(ed, 'building', i) ? 3 : 1.5);
      ctx.strokeStyle = isSel(ed, 'building', i) ? SELECT : '#94a3b8';
      ctx.stroke();
      ctx.setLineDash([]);
      if (z > 0.3) {
        const [x, y, w, h] = b.rect;
        const label = b.label || b.name;
        ctx.font = `600 ${px(11)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tw = ctx.measureText(label).width + px(8);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(x + w / 2 - tw / 2, y + h / 2 - px(8), tw, px(16));
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(label, x + w / 2, y + h / 2);
      }
    });
  }

  // Pedestrian paths
  if (L.peds) {
    m.pedestrian_paths.forEach((p, i) => {
      if (!p.points || p.points.length < 2 || !inView(p.points, view)) return;
      tracePoly(ctx, p.points, false);
      ctx.lineWidth = px(isSel(ed, 'ped', i) ? 4 : 2.5);
      ctx.strokeStyle = isSel(ed, 'ped', i) ? SELECT : '#38bdf8';
      ctx.setLineDash([px(5), px(4)]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#38bdf8';
      for (const [x, y] of [p.points[0], p.points[p.points.length - 1]]) {
        ctx.beginPath();
        ctx.arc(x, y, px(3.5), 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // Spawn arrow for the current mission
  const sp = ed.spawnTarget().obj.spawn;
  if (sp) {
    const a = ((sp.heading || 0) * Math.PI) / 180;
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate(a);
    ctx.fillStyle = isSel(ed, 'spawn') ? SELECT : '#f8fafc';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = px(1.5);
    const s = px(14) + 6;
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.7, -s * 0.6);
    ctx.lineTo(-s * 0.35, 0);
    ctx.lineTo(-s * 0.7, s * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Vertex handles on the selected shape
  const pts = ed.shapePoints(ed.selection);
  if (pts) {
    const r = ed.handleRadius();
    for (const [x, y] of pts) {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = SELECT;
      ctx.lineWidth = px(2);
      ctx.beginPath();
      ctx.rect(x - r, y - r, r * 2, r * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // In-progress polygon / path
  if (ed.draft.length) {
    const draftPts = ed.hover ? [...ed.draft, ed.hover] : ed.draft;
    const isZone = ed.tool === 'grass' || ed.tool === 'solid';
    const color = isZone ? ZONE_STYLE[ed.tool].stroke : ed.tool === 'ped' ? '#38bdf8' : SELECT;
    tracePoly(ctx, draftPts, false);
    ctx.lineWidth = px(2);
    ctx.strokeStyle = color;
    ctx.setLineDash([px(6), px(4)]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    for (const [x, y] of ed.draft) {
      ctx.beginPath();
      ctx.arc(x, y, px(4), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Stall row preview
  if (ed.stallDrag) {
    const { a, b } = ed.stallDrag;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const count = len < STALL_W ? 1 : Math.floor(len / STALL_W);
    const ux = len ? (b[0] - a[0]) / len : 0, uy = len ? (b[1] - a[1]) / len : 0;
    const angle = len < STALL_W ? 0 : (Math.atan2(uy, ux) * 180) / Math.PI + 90;
    const color = LOT_COLORS[ed.permit];
    for (let k = 0; k < count; k++) {
      const d = len < STALL_W ? 0 : STALL_W / 2 + k * STALL_W;
      tracePoly(ctx, stallCorners({ x: a[0] + ux * d, y: a[1] + uy * d, width: STALL_W, height: STALL_L, angle }));
      ctx.fillStyle = color + '55';
      ctx.fill();
      ctx.strokeStyle = SELECT;
      ctx.lineWidth = px(1.5);
      ctx.stroke();
    }
  }
}
