import React, { useEffect, useRef, useState } from 'react';
import {
  MousePointer2, SquareParking, Grid3x3, Building2, Leaf, BrickWall, Footprints, Navigation, Eraser,
  Undo2, Redo2, Save, X, Layers, LoaderCircle
} from 'lucide-react';
import { TOOLS, PERMIT_TYPES, LOT_COLORS } from './editorState';

const TOOL_ICONS = {
  select: MousePointer2, lot: SquareParking, stall: Grid3x3, building: Building2, grass: Leaf,
  solid: BrickWall, ped: Footprints, spawn: Navigation, delete: Eraser
};
const LAYER_LABELS = { zones: 'Grass & solid', lots: 'Lots', stalls: 'Stalls', buildings: 'Buildings', peds: 'Ped paths', legacy: 'Old red tiles' };

const panel = 'bg-emerald-950/90 border border-white/15 rounded-xl shadow-xl backdrop-blur-sm';
const inputCls = 'w-full bg-slate-950/70 border border-white/15 rounded-md px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-amber-400';

function Field({ label, children }) {
  return (
    <label className="block mb-2">
      <span className="block text-[10px] uppercase tracking-widest text-amber-300/80 mb-1">{label}</span>
      {children}
    </label>
  );
}

function PermitSelect({ value, onChange }) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      {PERMIT_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
    </select>
  );
}

function Properties({ ed }) {
  const sel = ed.selection, m = ed.map;
  if (!sel) return <p className="text-xs text-slate-400">Nothing selected. Use Select (V) and click a shape.</p>;

  if (sel.kind === 'zone') {
    const z = m.zones[sel.i];
    return (
      <>
        <Field label="Zone name"><input className={inputCls} defaultValue={z.name} key={z.id} onBlur={(e) => e.target.value !== z.name && ed.updateSelected({ name: e.target.value })} /></Field>
        <Field label="Type">
          <select className={inputCls} value={z.type} onChange={(e) => ed.updateSelected({ type: e.target.value })}>
            <option value="grass">Grass (drivable, strike)</option>
            <option value="solid">Solid (wall)</option>
          </select>
        </Field>
        <p className="text-[11px] text-slate-400">{z.polygon.length} points</p>
      </>
    );
  }
  if (sel.kind === 'lot') {
    const lot = m.lots[sel.i];
    return (
      <>
        <Field label="Lot name"><input className={inputCls} defaultValue={lot.name} key={lot.id} onBlur={(e) => e.target.value !== lot.name && ed.updateSelected({ name: e.target.value })} /></Field>
        <Field label="Permit"><PermitSelect value={lot.lot_type} onChange={(v) => ed.updateSelected({ lot_type: v })} /></Field>
        <button className="w-full text-xs py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-700 text-slate-100 mb-2" onClick={() => ed.updateSelected({ lot_type: lot.lot_type, applyToStalls: true })}>
          Set all {lot.stalls?.length || 0} stalls to {lot.lot_type}
        </button>
        <p className="text-[11px] text-slate-400">{lot.stalls?.length || 0} stalls · id {lot.id}</p>
      </>
    );
  }
  if (sel.kind === 'stall') {
    const s = m.lots[sel.i].stalls[sel.j];
    return (
      <>
        <Field label="Stall permit"><PermitSelect value={s.stall_type} onChange={(v) => ed.updateSelected({ stall_type: v })} /></Field>
        <Field label="Angle (° — [ and ] rotate)">
          <input type="number" className={inputCls} value={s.angle || 0} onChange={(e) => ed.updateSelected({ angle: Number(e.target.value) || 0 })} />
        </Field>
        <p className="text-[11px] text-slate-400">In {m.lots[sel.i].name}</p>
      </>
    );
  }
  if (sel.kind === 'building') {
    const b = m.buildings[sel.i];
    const traced = b.polygon && b.polygon.length >= 3;
    return (
      <>
        <Field label="Building name"><input className={inputCls} defaultValue={b.name} key={b.id} onBlur={(e) => e.target.value !== b.name && ed.updateSelected({ name: e.target.value, label: e.target.value })} /></Field>
        {!traced && (
          <p className="text-[11px] text-amber-300 mb-2">Dashed box = label only, not solid. Trace its walls to give it a hitbox.</p>
        )}
        <button className="w-full text-xs py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-700 text-slate-100 mb-2" onClick={() => ed.startTrace(sel.i)}>
          {traced ? 'Retrace outline' : 'Trace outline'}
        </button>
        <p className="text-[11px] text-slate-400">{traced ? `${b.polygon.length} points · solid wall` : 'No hitbox yet'}</p>
      </>
    );
  }
  if (sel.kind === 'ped') {
    const p = m.pedestrian_paths[sel.i];
    return (
      <>
        <Field label="Walking speed">
          <input type="number" className={inputCls} value={p.speed} onChange={(e) => ed.updateSelected({ speed: Number(e.target.value) || 22 })} />
        </Field>
        <p className="text-[11px] text-slate-400">{p.points.length} points</p>
      </>
    );
  }
  if (sel.kind === 'spawn') {
    const t = ed.spawnTarget();
    return (
      <>
        <Field label="Heading (°)">
          <input type="number" className={inputCls} value={t.obj.spawn.heading} onChange={(e) => ed.updateSelected({ heading: Number(e.target.value) || 0 })} />
        </Field>
        <p className="text-[11px] text-slate-400">{t.label}</p>
      </>
    );
  }
  return null;
}

export function MapEditor({ ed, version, saving, onSave, onExit }) {
  const surfaceRef = useRef(null);
  const lastPt = useRef(null);
  const [, setTick] = useState(0);

  // Re-render once a status message expires
  useEffect(() => {
    if (!ed.message) return;
    const t = setTimeout(() => setTick((n) => n + 1), 4100);
    return () => clearTimeout(t);
  }, [ed.message]);

  const toWorld = (e) => {
    const r = surfaceRef.current.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    return [ed.cam.x + (sx - r.width / 2) / ed.cam.zoom, ed.cam.y + (sy - r.height / 2) / ed.cam.zoom];
  };

  // Keyboard shortcuts while the editor is open
  useEffect(() => {
    function onKey(e) {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const k = e.key;
      if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? ed.redo() : ed.undo(); return; }
      if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'y') { e.preventDefault(); ed.redo(); return; }
      if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 's') { e.preventDefault(); onSave(); return; }
      if (k === 'Enter') { if (ed.draft.length) ed.finishDraft(); return; }
      if (k === 'Escape') { if (ed.draft.length) { ed.draft = []; } else { ed.selection = null; ed.traceTarget = null; } ed.changed(); return; }
      if (k === 'Backspace') { e.preventDefault(); if (ed.draft.length) { ed.draft.pop(); ed.changed(); } else ed.deleteSelection(); return; }
      if (k === 'Delete') { ed.deleteSelection(); return; }
      if (k === '[') { ed.rotateSelectedStall(-15); return; }
      if (k === ']') { ed.rotateSelectedStall(15); return; }
      const pan = 60;
      const arrows = { ArrowUp: [0, pan], ArrowDown: [0, -pan], ArrowLeft: [pan, 0], ArrowRight: [-pan, 0] };
      if (arrows[k]) { e.preventDefault(); ed.panScreen(...arrows[k]); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tool = TOOLS.find((t) => t.key.toLowerCase() === k.toLowerCase());
      if (tool) ed.setTool(tool.id);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ed, onSave]);

  const onPointerDown = (e) => {
    surfaceRef.current.setPointerCapture(e.pointerId);
    lastPt.current = [e.clientX, e.clientY];
    const [wx, wy] = toWorld(e);
    ed.pointerDown(wx, wy, { button: e.button, shift: e.shiftKey });
  };
  const onPointerMove = (e) => {
    const [wx, wy] = toWorld(e);
    if (ed.drag?.type === 'pan' && lastPt.current) {
      ed.panScreen(e.clientX - lastPt.current[0], e.clientY - lastPt.current[1]);
    }
    lastPt.current = [e.clientX, e.clientY];
    ed.pointerMove(wx, wy);
  };
  const onPointerUp = (e) => {
    lastPt.current = null;
    ed.pointerUp();
  };
  const onWheel = (e) => {
    const [wx, wy] = toWorld(e);
    ed.zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, wx, wy);
  };

  const toolInfo = TOOLS.find((t) => t.id === ed.tool);
  const msg = ed.message && Date.now() - ed.message.at < 4000 ? ed.message.text : null;
  const cursor = ed.tool === 'select' ? 'default' : ed.tool === 'delete' ? 'not-allowed' : 'crosshair';

  return (
    <div className="absolute inset-0 z-30 select-none" data-version={version}>
      {/* Drawing surface */}
      <div
        ref={surfaceRef}
        className="absolute inset-0"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={() => ed.draft.length && ed.finishDraft()}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Top bar */}
      <div className={`${panel} absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2`}>
        <span className="text-amber-400 font-bold tracking-widest text-xs uppercase">Map Editor</span>
        <span className={`text-[11px] ${ed.dirty ? 'text-amber-300' : 'text-emerald-300'}`}>{ed.dirty ? '● Unsaved changes' : 'Saved'}</span>
        <div className="w-px h-5 bg-white/15" />
        <button title="Undo (Ctrl+Z)" disabled={!ed.undoStack.length} onClick={() => ed.undo()} className="p-1.5 rounded-md text-slate-200 hover:bg-white/10 disabled:opacity-30"><Undo2 className="w-4 h-4" /></button>
        <button title="Redo (Ctrl+Y)" disabled={!ed.redoStack.length} onClick={() => ed.redo()} className="p-1.5 rounded-md text-slate-200 hover:bg-white/10 disabled:opacity-30"><Redo2 className="w-4 h-4" /></button>
        <button title="Save (Ctrl+S)" disabled={saving || !ed.dirty} onClick={onSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-400 text-emerald-950 text-xs font-bold disabled:opacity-40">
          {saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
        </button>
        <button title="Back to driving (=)" onClick={onExit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold">
          <X className="w-4 h-4" /> Drive (=)
        </button>
      </div>

      {/* Tool bar */}
      <div className={`${panel} absolute top-20 left-4 flex flex-col gap-1 p-2`}>
        {TOOLS.map((t) => {
          const Icon = TOOL_ICONS[t.id];
          const active = ed.tool === t.id;
          return (
            <button
              key={t.id}
              title={`${t.label} (${t.key})`}
              onClick={() => ed.setTool(t.id)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${active ? 'bg-amber-400 text-emerald-950' : 'text-slate-200 hover:bg-white/10'}`}
            >
              <Icon className="w-4 h-4" />
              <span className="w-16 text-left">{t.label}</span>
              <kbd className={`text-[10px] ${active ? 'text-emerald-900' : 'text-slate-500'}`}>{t.key}</kbd>
            </button>
          );
        })}
      </div>

      {/* Right panel: new-shape permit, layers, properties */}
      <div className={`${panel} absolute top-20 right-4 w-60 p-3 max-h-[calc(100vh-7rem)] overflow-y-auto`}>
        <Field label="Permit for new lots & stalls">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: LOT_COLORS[ed.permit] }} />
            <PermitSelect value={ed.permit} onChange={(v) => { ed.permit = v; ed.changed(); }} />
          </div>
        </Field>

        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-amber-300/80 mt-3 mb-1"><Layers className="w-3 h-3" /> Layers</div>
        {Object.keys(LAYER_LABELS).map((k) => (
          <label key={k} className="flex items-center gap-2 text-xs text-slate-200 py-0.5">
            <input type="checkbox" checked={ed.layers[k]} onChange={(e) => { ed.layers[k] = e.target.checked; ed.changed(); }} />
            {LAYER_LABELS[k]}
          </label>
        ))}
        <label className="flex items-start gap-2 text-xs text-slate-200 py-1 mt-1 border-t border-white/10">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={ed.map.use_legacy_collision_tiles}
            onChange={(e) => { ed.pushUndo(); ed.map.use_legacy_collision_tiles = e.target.checked; ed.changed(); }}
          />
          <span>Old red tiles still count as off-road<span className="block text-[10px] text-slate-400">Turn off once grass zones cover those areas</span></span>
        </label>

        <div className="text-[10px] uppercase tracking-widest text-amber-300/80 mt-3 mb-2">Selected</div>
        <Properties ed={ed} />
      </div>

      {/* Hint / message bar */}
      <div className={`${panel} absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 max-w-2xl text-center`}>
        <p className={`text-xs ${msg ? 'text-amber-300' : 'text-slate-200'}`}>{msg || toolInfo?.hint}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Scroll to zoom · right-drag or arrow keys to pan · Ctrl+S save · = back to driving</p>
      </div>
    </div>
  );
}
