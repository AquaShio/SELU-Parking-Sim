import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, CheckCircle, XCircle, AlertTriangle, Download, RotateCcw, Home, Clock, ShieldAlert } from 'lucide-react';
import { getExportCsvUrl } from '../services/api';

export function DebriefModal({
  runData,
  onPlayAgain,
  onBackToMenu
}) {
  const isSuccess = runData?.result === 'parked';
  const isTimeout = runData?.result === 'timeout';
  const isGameOver = runData?.result === 'game_over';

  useEffect(() => {
    if (isSuccess) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00573D', '#FFC72C', '#10B981', '#FFFFFF']
        });
      } catch {
        // Fallback
      }
    }
  }, [isSuccess]);

  const csvUrl = runData?.id ? getExportCsvUrl(runData.id) : null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="selu-panel max-w-xl w-full rounded-3xl p-8 border border-amber-400/30 flex flex-col gap-6 shadow-2xl">
        
        {/* Result Header */}
        <div className="text-center flex flex-col items-center gap-2">
          {isSuccess && (
            <div className="w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50">
              <CheckCircle className="w-10 h-10" />
            </div>
          )}
          {isTimeout && (
            <div className="w-16 h-16 rounded-full bg-amber-950 border-2 border-amber-500 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/50">
              <Clock className="w-10 h-10" />
            </div>
          )}
          {isGameOver && (
            <div className="w-16 h-16 rounded-full bg-red-950 border-2 border-red-500 flex items-center justify-center text-red-400 shadow-lg shadow-red-950/50">
              <XCircle className="w-10 h-10" />
            </div>
          )}

          <h2 className="text-2xl font-black font-chakra tracking-wide text-white mt-2">
            {isSuccess && 'PARKED ON TIME!'}
            {isTimeout && 'CLASS STARTED — TIMEOUT'}
            {isGameOver && 'CAMPUS DISQUALIFICATION'}
          </h2>
          <div className="text-xs text-slate-300">
            {isSuccess && 'You found an authorized stall and made it to class on time.'}
            {isTimeout && 'You did not find an eligible parking spot before the morning bell.'}
            {isGameOver && 'Exceeded the 3-strike limit from speeding, curbs, or permit violations.'}
          </div>
        </div>

        {/* Score Card Display */}
        <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-2xl p-6 flex flex-col items-center">
          <div className="text-xs uppercase font-extrabold tracking-widest text-slate-400">Final Score</div>
          <div className="text-5xl font-black font-chakra text-amber-400 my-1">
            {runData?.score || 0}
          </div>
          <div className="text-xs text-slate-300">Points Awarded</div>
        </div>

        {/* Run Details Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Time to Park</div>
            <div className="text-base font-bold font-mono-code text-slate-200 mt-0.5">
              {runData?.time_to_park ? `${Math.round(runData.time_to_park)}s` : 'N/A'}
            </div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Strikes</div>
            <div className="text-base font-bold font-mono-code text-red-400 mt-0.5">
              {runData?.strikes || 0} / 3
            </div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Alignment</div>
            <div className="text-base font-bold font-mono-code text-emerald-400 mt-0.5">
              {runData?.alignment_offset !== undefined && runData?.alignment_offset !== null
                ? `${Math.max(0, Math.round((1 - runData.alignment_offset) * 100))}%`
                : 'N/A'}
            </div>
          </div>
        </div>

        {/* Telemetry CSV Export Button */}
        {csvUrl && (
          <a
            href={csvUrl}
            download={`selu_parksim_run_${runData?.id || 1}.csv`}
            className="selu-btn-secondary w-full py-3 text-center text-xs justify-center"
          >
            <Download className="w-4 h-4 text-amber-400" />
            Download Coursework Telemetry (CSV)
          </a>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onBackToMenu}
            className="selu-btn-secondary flex-1 py-3"
          >
            <Home className="w-4 h-4" />
            Main Menu
          </button>
          <button
            onClick={onPlayAgain}
            className="selu-btn-primary flex-1 py-3"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>
        </div>

      </div>
    </div>
  );
}
