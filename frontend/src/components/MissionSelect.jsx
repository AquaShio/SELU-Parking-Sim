import React, { useState } from 'react';
import {
  Car,
  Clock,
  Award,
  Shield,
  Compass,
  MapPin,
  Sparkles,
  User,
  Play,
  AlertTriangle,
  Info,
  CheckCircle,
  Radio,
  Sliders
} from 'lucide-react';

export function MissionSelect({
  mapData,
  permitsConfig,
  difficultyConfig,
  playerStats,
  onStartMission
}) {
  const [selectedPermit, setSelectedPermit] = useState('upperclass');
  const [selectedMissionIndex, setSelectedMissionIndex] = useState(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState(1);

  const destinations = mapData?.destinations || [
    {
      id: 'dest_fayard',
      name: 'CMPS 4550 Class at Fayard Hall',
      building_id: 'b_fayard',
      description: 'Your Senior Capstone presentation starts in 90 seconds! Find a legal stall without getting ticketed.',
      time_limit_s: 90
    },
    {
      id: 'dest_union',
      name: 'Lunch Rush at War Memorial Student Union',
      building_id: 'b_union',
      description: 'Meet your study group for lunch. Center campus traffic is intense and stalls fill up rapidly.',
      time_limit_s: 100
    },
    {
      id: 'dest_uc',
      name: 'Lion Pride Event at University Center',
      building_id: 'b_uc',
      description: 'Navigate SGA Drive to the main arena lots before the pep rally kickoff.',
      time_limit_s: 120
    },
    {
      id: 'dest_oaks',
      name: 'Evening Return to Southeastern Oaks',
      building_id: 'b_oaks',
      description: 'Head back to the student residence village along North Campus and park cleanly.',
      time_limit_s: 110
    }
  ];

  const permits = permitsConfig?.permits || {
    freshman: {
      label: 'Freshman Commuter',
      color: '#8B4513',
      tag_color: 'Brown',
      badge: 'FR',
      description: 'Authorized for University Center & North Campus commuter lots.'
    },
    upperclass: {
      label: 'Upperclass Commuter',
      color: '#D4A017',
      tag_color: 'Golden Yellow',
      badge: 'UC',
      description: 'Full campus access across North Oak Street, SGA Drive & Union lots.'
    },
    faculty: {
      label: 'Faculty & Staff',
      color: '#DC2626',
      tag_color: 'Red',
      badge: 'FAC',
      description: 'Access to reserved faculty spaces plus all general commuter lots.'
    },
    resident: {
      label: 'Resident Hall',
      color: '#721226',
      tag_color: 'Dark Burgundy',
      badge: 'RES',
      description: 'Designated residence hall parking zones and campus commuter lots.'
    }
  };

  const currentDestination = destinations[selectedMissionIndex] || destinations[0];

  const handleStart = () => {
    onStartMission({
      permitType: selectedPermit,
      destination: currentDestination,
      difficulty: selectedDifficulty
    });
  };

  return (
    <div className="fixed inset-0 z-30 w-screen h-screen flex flex-col lg:flex-row bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* LEFT COLUMN: Southeastern Hero & Driver Briefing (~30% width on large screens) */}
      <div className="lg:w-[34%] xl:w-[30%] 2xl:w-[28%] flex flex-col justify-between p-6 lg:p-8 xl:p-10 bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 border-r border-amber-400/25 shadow-2xl relative overflow-y-auto">
        <div className="flex flex-col gap-6">
          
          {/* Southeastern Header Branding */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-900/90 border-2 border-amber-400 flex items-center justify-center shadow-lg shadow-emerald-950/80 flex-shrink-0">
              <Car className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <div className="text-[11px] uppercase font-black tracking-widest text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                Southeastern Louisiana University
              </div>
              <h1 className="text-3xl xl:text-4xl font-black font-chakra tracking-wide text-white">
                SELU <span className="text-amber-400">ParkSim</span>
              </h1>
              <div className="text-xs text-slate-300">
                Official Campus Parking Simulator • CMPS 4550/5550 Capstone
              </div>
            </div>
          </div>

          {/* Career Stats Card */}
          <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Driver Career Record</div>
                <div className="text-2xl font-black font-chakra text-amber-400">
                  {playerStats?.best_score ? `${playerStats.best_score} pts` : '0 pts'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Missions Run</div>
              <div className="text-xl font-black font-chakra text-white">
                {playerStats?.runs_played || 0}
              </div>
            </div>
          </div>

          {/* Driving Controls Reference */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5">
            <div className="text-[11px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Intuitive Vehicle Controls
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[11px] font-bold border border-slate-700">W A S D</kbd>
                <span className="text-slate-300">Drive & Steer</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[11px] font-bold border border-slate-700">Shift</kbd>
                <span className="text-slate-300">Slow Creep Park</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[11px] font-bold border border-slate-700">C</kbd>
                <span className="text-slate-300">Cruise Control</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[11px] font-bold border border-slate-700">Space</kbd>
                <span className="text-slate-300">Handbrake</span>
              </div>
            </div>
          </div>

          {/* Southeastern Campus Regulations Tip */}
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl p-3.5 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              <strong className="text-amber-300 font-bold">Campus Traffic Rule:</strong> Always yield to student pedestrians crossing North Oak Street. Park inside stall lines and avoid curbs or campus landscaping to prevent penalty strikes.
            </div>
          </div>

        </div>

        {/* Footer info in left pane */}
        <div className="pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Connected to Southeastern Concept3D Map
          </div>
          <span className="font-mono text-slate-400">SELU Green & Gold</span>
        </div>

      </div>

      {/* RIGHT COLUMN: Mission & Permit Configuration */}
      <div className="flex-1 flex flex-col justify-between p-6 lg:p-8 xl:p-10 bg-slate-950/95 overflow-y-auto">
        <div className="flex flex-col gap-6 w-full">
          
          {/* STEP 1: Select Your Permit Tier */}
          <div>
            <div className="text-xs uppercase font-extrabold text-amber-400 tracking-wider mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black">1</span>
              Select Your Southeastern Permit Tier
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(permits).map(([key, info]) => {
                const isSelected = selectedPermit === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedPermit(key)}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-400 bg-emerald-950/80 shadow-lg shadow-emerald-950/60 ring-1 ring-amber-400 scale-[1.02]'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-white/30 shadow-sm flex-shrink-0"
                            style={{ backgroundColor: info.color || '#D4A017' }}
                          />
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded border"
                            style={{
                              backgroundColor: `${info.color || '#D4A017'}25`,
                              borderColor: `${info.color || '#D4A017'}55`,
                              color: info.color === '#8B4513' ? '#F59E0B' : (info.color || '#D4A017')
                            }}
                          >
                            {info.tag_color || info.tagColor || 'Tag'}
                          </span>
                        </div>
                        {isSelected ? (
                          <span className="text-[10px] font-bold text-amber-400 uppercase bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/40">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            {info.badge || key}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-slate-100">{info.label}</div>
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {info.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: Choose Destination Mission */}
          <div>
            <div className="text-xs uppercase font-extrabold text-amber-400 tracking-wider mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black">2</span>
              Choose Class Destination & Parking Objective
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3.5">
              {destinations.map((dest, idx) => {
                const isSelected = selectedMissionIndex === idx;
                return (
                  <button
                    key={dest.id || idx}
                    onClick={() => setSelectedMissionIndex(idx)}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-4 ${
                      isSelected
                        ? 'border-amber-400 bg-emerald-950/80 shadow-lg ring-1 ring-amber-400 scale-[1.01]'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                        : 'bg-slate-800 border-slate-700 text-amber-400'
                    }`}>
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-bold text-slate-100 truncate">{dest.name}</div>
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/25 flex-shrink-0">
                          {dest.time_limit_s}s
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {dest.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3: Congestion & Rush Hour Schedule */}
          <div>
            <div className="text-xs uppercase font-extrabold text-amber-400 tracking-wider mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black">3</span>
              Select Campus Rush Hour & Congestion Level
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { level: 1, name: 'Morning Commute', desc: '42% lot fullness, light pedestrian flow' },
                { level: 2, name: 'Midday Class Rush', desc: '58% lot fullness, active pedestrian crosswalks' },
                { level: 3, name: 'Final Exam Rush', desc: '72% lot fullness, heavy traffic & tighter clock' }
              ].map(diff => {
                const isSelected = selectedDifficulty === diff.level;
                return (
                  <button
                    key={diff.level}
                    onClick={() => setSelectedDifficulty(diff.level)}
                    className={`p-3.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400/15 text-amber-300 font-bold ring-1 ring-amber-400'
                        : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs uppercase font-black tracking-wider">Level {diff.level}</div>
                    <div className="text-sm font-bold text-slate-100 mt-0.5">{diff.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-snug">{diff.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* BOTTOM ACTION BAR: Selection Summary & Big Start Mission Button */}
        <div className="pt-6 mt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
          <div className="text-xs text-slate-300 flex items-center gap-2">
            <span className="text-slate-400">Mission Target:</span>
            <span className="text-amber-400 font-bold truncate max-w-xs">{currentDestination.name}</span>
            <span className="text-slate-500">•</span>
            <span
              className="font-bold flex items-center gap-1.5"
              style={{ color: permits[selectedPermit]?.color === '#8B4513' ? '#F59E0B' : (permits[selectedPermit]?.color || '#D4A017') }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block border border-white/30"
                style={{ backgroundColor: permits[selectedPermit]?.color || '#D4A017' }}
              />
              {permits[selectedPermit]?.label} ({permits[selectedPermit]?.tag_color || 'Tag'})
            </span>
          </div>

          <button
            onClick={handleStart}
            className="w-full sm:w-auto text-base font-chakra font-black px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-950 shadow-xl shadow-amber-400/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 border-2 border-amber-300"
          >
            <Play className="w-5 h-5 fill-current" />
            START PARKING MISSION
          </button>
        </div>

      </div>

    </div>
  );
}
