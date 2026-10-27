import React from 'react';
import { Shield, ShieldAlert, Volume2, VolumeX, Navigation, AlertTriangle, CheckCircle2, RotateCcw, ZoomIn, Gauge } from 'lucide-react';

export function HUD({
  speedMph,
  speedLimit,
  gear,
  timeRemaining,
  strikes,
  maxStrikes = 3,
  destination,
  distanceToDest,
  destAngleDeg,
  permitInfo,
  parkingProgress,
  alertToast,
  cameraZoom = 1.65,
  onCycleZoom,
  onResetVehicle,
  isMuted,
  onToggleMute,
  isCruiseActive,
  cruiseSpeedMph = 0,
  onToggleCruise,
  isPrecisionMode = false,
  showTouchControls,
  touchHandlers
}) {
  const isSpeeding = speedMph > speedLimit + 2;
  const isTimeUrgent = timeRemaining < 25;

  const mins = Math.floor(Math.max(0, timeRemaining) / 60);
  const secs = Math.floor(Math.max(0, timeRemaining) % 60);
  const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-20">
      {/* Top Bar: Mission Objective, Countdown Timer, Permit & Strike Counter */}
      <div className="flex items-start justify-between w-full gap-4">
        {/* Mission Destination Banner */}
        <div className="selu-panel rounded-xl px-4 py-3 pointer-events-auto flex items-center gap-3 max-w-md">
          <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-amber-400">
            <Navigation className="w-5 h-5 transform rotate-45" />
          </div>
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-amber-400">
              Campus Destination
            </div>
            <div className="text-sm font-bold text-slate-100 truncate">
              {destination ? destination.name : 'Find an Authorized Stall'}
            </div>
            <div className="text-xs text-slate-300">
              {distanceToDest ? `${Math.round(distanceToDest)} ft to target building` : 'Follow Golden Compass'}
            </div>
          </div>
        </div>

        {/* Center: Class Countdown Timer */}
        <div className={`selu-panel rounded-xl px-6 py-2 pointer-events-auto text-center border-2 transition-all ${
          isTimeUrgent ? 'border-red-500/80 bg-red-950/70 animate-pulse' : 'border-amber-400/30'
        }`}>
          <div className="text-xs uppercase font-semibold text-slate-300">Class Starts In</div>
          <div className={`text-2xl font-black font-chakra tracking-wider ${isTimeUrgent ? 'text-red-400' : 'text-amber-400'}`}>
            {timeFormatted}
          </div>
        </div>

        {/* Right: Permit Badge, Strikes, Zoom & Audio Controls */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <div className="selu-panel rounded-xl px-3 py-2 flex items-center gap-2 border" style={{ borderColor: `${permitInfo?.color || '#e3e12c'}45` }}>
            <div
              className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-sm flex-shrink-0"
              style={{ backgroundColor: permitInfo?.color || '#e3e12c' }}
            />
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>{permitInfo?.label || 'Student Permit'}</span>
              {(permitInfo?.tag_color || permitInfo?.tagColor) && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase border"
                  style={{
                    backgroundColor: `${permitInfo.color || '#e3e12c'}20`,
                    borderColor: `${permitInfo.color || '#e3e12c'}50`,
                    color: permitInfo.color || '#e3e12c'
                  }}
                >
                  {permitInfo.tag_color || permitInfo.tagColor}
                </span>
              )}
            </div>
          </div>

          <div className="selu-panel rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-slate-300">Strikes:</span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: maxStrikes }).map((_, i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                    i < strikes
                      ? 'bg-red-500/90 text-white strike-alert shadow-red-500/50 shadow-md'
                      : 'bg-slate-800/80 text-slate-500 border border-slate-700'
                  }`}
                >
                  {i < strikes ? <ShieldAlert className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                </div>
              ))}
            </div>
          </div>

          {onCycleZoom && (
            <button
              onClick={onCycleZoom}
              className="selu-btn-secondary px-2.5 py-2 rounded-xl flex items-center gap-1 text-xs font-bold text-amber-400"
              title="Cycle Camera Zoom"
            >
              <ZoomIn className="w-4 h-4" />
              <span>{cameraZoom.toFixed(1)}x</span>
            </button>
          )}

          {onResetVehicle && (
            <button
              onClick={onResetVehicle}
              className="selu-btn-secondary p-2.5 rounded-xl text-slate-200 hover:text-amber-400"
              title="Reset Car to Road Spawn (R)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onToggleMute}
            className="selu-btn-secondary p-2.5 rounded-xl"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Collision / Off-Road / Violation Alert Toast */}
      {alertToast && (
        <div
          className={`self-center px-5 py-2.5 rounded-xl border-2 shadow-2xl flex items-center gap-3 pointer-events-auto transition-all ${
            alertToast.severity === 'error'
              ? 'bg-red-950/90 border-red-500 text-red-100'
              : 'bg-amber-950/90 border-amber-400 text-amber-100'
          }`}
        >
          <AlertTriangle className={`w-5 h-5 ${alertToast.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`} />
          <span className="text-xs font-extrabold uppercase tracking-wider">{alertToast.message}</span>
        </div>
      )}

      {/* Top Floating Parking Docking Overlay */}
      {parkingProgress > 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 selu-panel px-6 py-3.5 rounded-2xl flex items-center gap-4 border border-amber-400 shadow-2xl shadow-amber-400/20 animate-fade-in pointer-events-auto z-30">
          <CheckCircle2 className="w-6 h-6 text-amber-400 animate-spin" />
          <div>
            <div className="text-xs uppercase font-black text-amber-400 tracking-wider">
              Docking in Authorized Stall
            </div>
            <div className="text-sm font-bold text-slate-100">
              Hold Vehicle Still... {Math.round(parkingProgress * 100)}%
            </div>
          </div>
          <div className="w-36 bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-75"
              style={{ width: `${parkingProgress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom Bar: Dashboard (Speedometer, Controls Legend, Golden Compass) */}
      <div className="flex items-end justify-between w-full">
        {/* Left: Digital Speedometer, Speed Zone & Cruise Control */}
        <div className="selu-panel rounded-2xl p-4 pointer-events-auto flex items-center gap-4">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={isSpeeding ? '#EF4444' : (isCruiseActive ? '#10B981' : '#FFC72C')}
                strokeWidth="8"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (Math.min(speedMph, 35) / 35) * 251.2}
                strokeLinecap="round"
                className="transition-all duration-75"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold font-chakra leading-none ${isSpeeding ? 'text-red-400' : 'text-slate-100'}`}>
                {Math.round(speedMph)}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400">MPH</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className={`px-2.5 py-1 rounded-lg border text-center ${
              isSpeeding ? 'bg-red-950/80 border-red-500 text-red-300' : 'bg-slate-900 border-slate-700 text-slate-200'
            }`}>
              <div className="text-[9px] uppercase font-extrabold text-slate-400">Limit</div>
              <div className="text-base font-black font-chakra leading-none">{speedLimit}</div>
            </div>

            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center justify-center gap-2 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
                <span className={`text-xs font-bold ${gear === 'D' ? 'text-emerald-400 font-extrabold' : 'text-slate-500'}`}>D</span>
                <span className="text-slate-600">/</span>
                <span className={`text-xs font-bold ${gear === 'R' ? 'text-amber-400 font-extrabold' : 'text-slate-500'}`}>R</span>
              </div>

              {/* Cruise Control Toggle Button */}
              <button
                onClick={onToggleCruise}
                className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
                  isCruiseActive
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-300 shadow-emerald-500/30 shadow-sm'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle Cruise Control (Press C)"
              >
                <Gauge className="w-3 h-3" />
                <span>{isCruiseActive ? `${Math.round(cruiseSpeedMph)}` : 'CRUISE'}</span>
              </button>
            </div>

            {isPrecisionMode && (
              <div className="text-[9px] uppercase font-extrabold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-400/40 text-center animate-pulse">
                Slow Creep (Shift)
              </div>
            )}
          </div>
        </div>

        {/* Center: Controls Legend */}
        <div className="selu-panel px-4 py-2.5 rounded-xl pointer-events-auto hidden md:flex items-center gap-3.5 text-xs text-slate-300">
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 font-bold">W</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 font-bold">S</kbd>
            <span>Drive / Rev</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 font-bold">A</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 font-bold">D</kbd>
            <span>Steer</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 font-bold">SPACE</kbd>
            <span>Brake</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400 font-bold">C</kbd>
            <span>Cruise</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 font-bold">SHIFT</kbd>
            <span>Creep</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 font-bold">R</kbd>
            <span>Reset</span>
          </div>
        </div>

        {/* Right: Golden Compass to Destination */}
        <div className="selu-panel rounded-2xl p-4 pointer-events-auto flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-full bg-slate-900 border border-amber-400/40 flex items-center justify-center">
            <div
              className="absolute w-full h-full flex items-center justify-center transition-transform duration-100"
              style={{ transform: `rotate(${destAngleDeg}deg)` }}
            >
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[18px] border-b-amber-400 transform -translate-y-3" />
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-amber-400">Target</div>
            <div className="text-xs font-bold text-slate-200 max-w-[110px] truncate">
              {destination ? destination.name.split('(')[0].trim() : 'SELU Campus'}
            </div>
          </div>
        </div>
      </div>

      {/* Optional Touch Controls for Mobile/Tablets */}
      {showTouchControls && (
        <div className="absolute inset-x-4 bottom-24 pointer-events-auto flex justify-between md:hidden">
          <div className="flex gap-2">
            <button
              onTouchStart={() => touchHandlers.setSteer(-1)}
              onTouchEnd={() => touchHandlers.setSteer(0)}
              className="w-16 h-16 rounded-2xl bg-slate-800/90 border border-slate-600 text-2xl font-bold flex items-center justify-center text-amber-400 active:bg-amber-400 active:text-slate-950"
            >
              ◀
            </button>
            <button
              onTouchStart={() => touchHandlers.setSteer(1)}
              onTouchEnd={() => touchHandlers.setSteer(0)}
              className="w-16 h-16 rounded-2xl bg-slate-800/90 border border-slate-600 text-2xl font-bold flex items-center justify-center text-amber-400 active:bg-amber-400 active:text-slate-950"
            >
              ▶
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onTouchStart={() => touchHandlers.setBrake(1)}
              onTouchEnd={() => touchHandlers.setBrake(0)}
              className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-500 text-xs font-bold flex items-center justify-center text-red-300 active:bg-red-600 active:text-white"
            >
              BRAKE
            </button>
            <button
              onTouchStart={() => touchHandlers.setThrottle(1)}
              onTouchEnd={() => touchHandlers.setThrottle(0)}
              className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-xs font-bold flex items-center justify-center text-emerald-300 active:bg-emerald-500 active:text-slate-950"
            >
              GAS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
