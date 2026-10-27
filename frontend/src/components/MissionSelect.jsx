import React, { useState } from "react";
import {
  Car,
  Award,
  MapPin,
  Play,
  Info,
  Sliders,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";

export function MissionSelect({
  mapData,
  permitsConfig,
  difficultyConfig,
  playerStats,
  onStartMission,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPermit, setSelectedPermit] = useState("upperclass");
  const [selectedMissionIndex, setSelectedMissionIndex] = useState(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState(1);

  const destinations = mapData?.destinations || [
    {
      id: "dest_fayard",
      name: "CMPS 4550 Class at Fayard Hall",
      building_id: "b_fayard",
      description:
        "Your Senior Capstone presentation starts in 90 seconds! Find a legal stall without getting ticketed.",
      time_limit_s: 90,
    },
    {
      id: "dest_union",
      name: "Lunch Rush at War Memorial Student Union",
      building_id: "b_union",
      description:
        "Meet your study group for lunch. Center campus traffic is intense and stalls fill up rapidly.",
      time_limit_s: 100,
    },
    {
      id: "dest_uc",
      name: "Lion Pride Event at University Center",
      building_id: "b_uc",
      description:
        "Navigate SGA Drive to the main arena lots before the pep rally kickoff.",
      time_limit_s: 120,
    },
    {
      id: "dest_oaks",
      name: "Evening Return to Southeastern Oaks",
      building_id: "b_oaks",
      description:
        "Head back to the student residence village along North Campus and park cleanly.",
      time_limit_s: 110,
    },
  ];

  const permits =
    permitsConfig?.permits && Object.keys(permitsConfig.permits).length > 0
      ? permitsConfig.permits
      : {
          freshman: {
      label: "Freshman Commuter",
      color: "#703d2a",
      description:
        "Authorized for University Center & North Campus commuter lots.",
    },
    upperclass: {
      label: "Upperclass Commuter",
      color: "#e3e12c",
      description:
        "Full campus access across North Oak Street, SGA Drive & Union lots.",
    },
    faculty: {
      label: "Faculty & Staff",
      color: "#DC2626",
      description:
        "Access to reserved faculty spaces plus all general commuter lots.",
    },
    resident: {
      label: "Resident Hall",
      color: "#721226",
      description:
        "Designated residence hall parking zones and campus commuter lots.",
    },
  };

  const difficultyOptions = [
    {
      level: 1,
      name: "Morning Commute",
      desc: "42% lot fullness, light pedestrian flow",
    },
    {
      level: 2,
      name: "Midday Class Rush",
      desc: "58% lot fullness, active pedestrian crosswalks",
    },
    {
      level: 3,
      name: "Final Exam Rush",
      desc: "72% lot fullness, heavy traffic & tighter clock",
    },
  ];

  const currentDestination =
    destinations[selectedMissionIndex] || destinations[0];

  const getPermitColor = (key, fallbackColor) => {
    if (key === "freshman") return "#703d2a";
    if (key === "upperclass") return "#e3e12c";
    return fallbackColor || "#e3e12c";
  };

  const activePermitColor = getPermitColor(
    selectedPermit,
    permits[selectedPermit]?.color,
  );

  const handleStart = () => {
    onStartMission({
      permitType: selectedPermit,
      destination: currentDestination,
      difficulty: selectedDifficulty,
    });
  };

  const steps = [
    { num: 1, title: "Permit Tier" },
    { num: 2, title: "Destination" },
    { num: 3, title: "Rush Hour" },
  ];

  return (
    <div className="fixed inset-0 z-30 w-screen h-screen flex flex-col lg:flex-row selu-menu-gradient text-slate-100 overflow-hidden tracking-wide">
      {/* LEFT COLUMN: Southeastern Hero & Driver Briefing */}
      <div className="lg:w-[34%] xl:w-[30%] 2xl:w-[28%] flex flex-col justify-between p-6 lg:p-8 xl:p-10 bg-emerald-950/55 backdrop-blur-md border-r border-amber-400/35 shadow-2xl relative overflow-y-auto">
        <div className="flex flex-col gap-6">
          {/* Southeastern Header Branding */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-900/90 border-2 border-amber-400 flex items-center justify-center shadow-lg shadow-emerald-950/80 flex-shrink-0">
              <Car className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <div className="text-[11px] uppercase font-bold tracking-widest text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block flex-shrink-0" />
                <span>Southeastern Louisiana University</span>
              </div>
              <h1 className="text-3xl xl:text-4xl font-bold font-chakra tracking-wider text-white mt-0.5">
                SELU <span className="text-amber-400">ParkSim</span>
              </h1>
              <div className="text-xs text-slate-200 tracking-wide mt-0.5 leading-snug">
                Official Campus Parking Simulator {" "}
                <span className="whitespace-nowrap">CMPS 4550: Serious Game Design</span>
              </div>
            </div>
          </div>

          {/* Career Stats Card */}
          <div className="bg-emerald-950/70 border border-amber-400/30 rounded-2xl p-5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-300 tracking-widest">
                  Driver Career Record
                </div>
                <div className="text-2xl font-bold font-chakra tracking-wider text-amber-400 mt-0.5">
                  {playerStats?.best_score
                    ? `${playerStats.best_score} pts`
                    : "0 pts"}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-semibold text-slate-300 tracking-widest">
                Missions Run
              </div>
              <div className="text-2xl font-bold font-chakra tracking-wider text-white mt-0.5">
                {playerStats?.runs_played || 0}
              </div>
            </div>
          </div>

          {/* Driving Controls Reference */}
          <div className="bg-emerald-950/70 border border-emerald-500/30 rounded-2xl p-5 flex flex-col gap-3 shadow-lg">
            <div className="text-[11px] uppercase font-bold text-amber-400 tracking-widest flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Controls
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-[11px]">
              <div className="flex items-center gap-2 bg-emerald-950/80 p-2 rounded-lg border border-emerald-700/50">
                <kbd className="min-w-[44px] px-1.5 py-1 rounded bg-emerald-900 text-amber-300 font-mono text-[11px] font-bold border border-amber-400/30 whitespace-nowrap flex-shrink-0 text-center">
                  WASD
                </kbd>
                <span className="text-slate-200 whitespace-nowrap">
                  Steering
                </span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-950/80 p-2 rounded-lg border border-emerald-700/50">
                <kbd className="min-w-[44px] px-1.5 py-1 rounded bg-emerald-900 text-amber-300 font-mono text-[11px] font-bold border border-amber-400/30 whitespace-nowrap flex-shrink-0 text-center">
                  Shift
                </kbd>
                <span className="text-slate-200 whitespace-nowrap">
                  Half Speed
                </span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-950/80 p-2 rounded-lg border border-emerald-700/50">
                <kbd className="min-w-[44px] px-1.5 py-1 rounded bg-emerald-900 text-amber-300 font-mono text-[11px] font-bold border border-amber-400/30 whitespace-nowrap flex-shrink-0 text-center">
                  C
                </kbd>
                <span className="text-slate-200 whitespace-nowrap">
                  Cruise Control
                </span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-950/80 p-2 rounded-lg border border-emerald-700/50">
                <kbd className="min-w-[44px] px-1.5 py-1 rounded bg-emerald-900 text-amber-300 font-mono text-[11px] font-bold border border-amber-400/30 whitespace-nowrap flex-shrink-0 text-center">
                  Space
                </kbd>
                <span className="text-slate-200 whitespace-nowrap">
                  Brake
                </span>
              </div>
            </div>
          </div>

          {/* Southeastern Campus Regulations Tip */}
          <div className="bg-emerald-950/75 border border-amber-400/35 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-100 leading-relaxed tracking-wide">
              <strong className="text-amber-300 font-semibold">
                Campus Traffic Rules:
              </strong>{" "}
              Always yield to pedestrians. Park inside stall lines, and remember
              not to back into stalls, or you'll get a ticket. Avoid curbs,
              landscaping, and other cars to avoid getting penalty strikes.
            </div>
          </div>
        </div>

        {/* Footer info in left pane */}
        <div className="pt-4 border-t border-white/20 h-16 flex items-center justify-between text-[11px] text-slate-200 tracking-wide">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            Connected to Southeastern Concept3D Map
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: 3-Step Prompt Flow */}
      <div className="flex-1 flex flex-col justify-between p-6 lg:p-8 xl:p-10 bg-emerald-950/35 backdrop-blur-sm overflow-y-auto">
        {/* TOP STEPPER BAR */}
        <div className="max-w-4xl w-full mx-auto">
          <div className="flex items-center justify-between gap-3 bg-emerald-950/80 border border-white/15 rounded-2xl p-3 shadow-lg">
            {steps.map((s, idx) => {
              const isActive = currentStep === s.num;
              const isCompleted = currentStep > s.num;
              return (
                <React.Fragment key={s.num}>
                  <button
                    onClick={() => setCurrentStep(s.num)}
                    className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2.5 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${
                      isActive
                        ? "bg-amber-400 text-emerald-950 border-amber-400 shadow-md"
                        : isCompleted
                          ? "bg-emerald-900/80 text-amber-300 border-amber-400/40 hover:bg-emerald-900"
                          : "bg-emerald-950/60 text-slate-400 border-transparent hover:text-slate-200"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                        isActive
                          ? "bg-emerald-950 text-amber-400"
                          : isCompleted
                            ? "bg-amber-400 text-emerald-950"
                            : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                    </span>
                    <span className="whitespace-nowrap">{s.title}</span>
                  </button>
                  {idx < steps.length - 1 && (
                    <div
                      className={`h-0.5 w-6 sm:w-10 rounded-full flex-shrink-0 ${
                        currentStep > s.num ? "bg-amber-400" : "bg-white/15"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* CENTER PROMPT CARD FOR CURRENT STEP */}
        <div className="max-w-4xl w-full mx-auto my-auto py-6">
          <div className="bg-emerald-950/80 border border-amber-400/35 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-md">
            {/* PROMPT 1: PERMIT TIER */}
            {currentStep === 1 && (
              <div className="flex flex-col gap-6">
                <div>
                  <div className="text-xs uppercase font-bold text-amber-400 tracking-widest mb-1.5">
                    Step 1 of 3 • Permit Selection
                  </div>
                  <h2
                    className="text-2xl sm:text-3xl font-bold font-chakra text-white"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    Pick Your Parking Permit
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                  {Object.entries(permits).map(([key, info]) => {
                    const isSelected = selectedPermit === key;
                    const permitColor = getPermitColor(key, info.color);
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedPermit(key)}
                        style={{
                          background: `linear-gradient(135deg, color-mix(in srgb, ${permitColor} 56%, #14221d) 0%, color-mix(in srgb, ${permitColor} 40%, #0d1814) 100%)`,
                          borderColor: isSelected
                            ? "#fde68a"
                            : `color-mix(in srgb, ${permitColor} 70%, rgba(255,255,255,0.25))`,
                        }}
                        className={`h-full p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-start cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-amber-300/80 shadow-2xl"
                            : "opacity-90 hover:opacity-100 shadow-lg"
                        }`}
                      >
                        <div className="w-full">
                          <div className="flex items-center justify-between gap-3 min-h-[28px]">
                            <div
                              className="text-lg font-bold text-white"
                              style={{ letterSpacing: "0.04em" }}
                            >
                              {info.label}
                            </div>
                            {isSelected && (
                              <span
                                className="text-[11px] font-bold uppercase px-3 py-1 rounded-full bg-black/40 text-amber-200 border border-amber-300/50 flex items-center gap-1.5 flex-shrink-0"
                                style={{ letterSpacing: "0.06em" }}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                Selected
                              </span>
                            )}
                          </div>
                          <div
                            className="text-sm text-slate-100/90 mt-2.5 leading-relaxed font-normal"
                            style={{ letterSpacing: "0.03em" }}
                          >
                            {info.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PROMPT 2: DESTINATION MISSION */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-6">
                <div>
                  <div className="text-xs uppercase font-bold text-amber-400 tracking-widest mb-1.5">
                    Step 2 of 3 • Mission Objective
                  </div>
                  <h2
                    className="text-2xl sm:text-3xl font-bold font-chakra text-white"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    Choose Class Destination & Parking Objective
                  </h2>
                  <p className="text-sm text-slate-200 mt-2 tracking-wide leading-relaxed">
                    Select your target campus building and beat the countdown
                    clock before class begins.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                  {destinations.map((dest, idx) => {
                    const isSelected = selectedMissionIndex === idx;
                    return (
                      <button
                        key={dest.id || idx}
                        onClick={() => setSelectedMissionIndex(idx)}
                        className={`h-full p-5 rounded-2xl border-2 text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                          isSelected
                            ? "border-amber-400 bg-emerald-900/75 shadow-xl ring-2 ring-amber-400/80"
                            : "border-white/20 bg-emerald-950/80 hover:bg-emerald-900/50 hover:border-amber-400/50 shadow-md"
                        }`}
                      >
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                            isSelected
                              ? "bg-amber-400 text-emerald-950 border-amber-400 font-bold"
                              : "bg-emerald-900/80 border-emerald-700 text-amber-400"
                          }`}
                        >
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                          <div>
                            <div className="flex items-start justify-between gap-2.5">
                              <div
                                className="text-[15px] font-bold text-white leading-snug"
                                style={{ letterSpacing: "0.025em" }}
                              >
                                {dest.name}
                              </div>
                              <span className="text-xs font-mono font-bold text-amber-300 bg-amber-400/15 px-2.5 py-0.5 rounded-md border border-amber-400/35 flex-shrink-0">
                                {dest.time_limit_s}s
                              </span>
                            </div>
                            <div
                              className="text-xs sm:text-sm text-slate-200 mt-2 leading-relaxed font-normal"
                              style={{ letterSpacing: "0.02em" }}
                            >
                              {dest.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PROMPT 3: RUSH HOUR & CONGESTION */}
            {currentStep === 3 && (
              <div className="flex flex-col gap-6">
                <div>
                  <div className="text-xs uppercase font-bold text-amber-400 tracking-widest mb-1.5">
                    Step 3 of 3 • Traffic & Congestion
                  </div>
                  <h2
                    className="text-2xl sm:text-3xl font-bold font-chakra text-white"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    Select Campus Rush Hour & Congestion Level
                  </h2>
                  <p className="text-sm text-slate-200 mt-2 tracking-wide leading-relaxed">
                    Higher rush hour levels increase parking lot occupancy and
                    pedestrian crosswalk traffic.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
                  {difficultyOptions.map((diff) => {
                    const isSelected = selectedDifficulty === diff.level;
                    return (
                      <button
                        key={diff.level}
                        onClick={() => setSelectedDifficulty(diff.level)}
                        className={`h-full p-6 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-start ${
                          isSelected
                            ? "border-amber-400 bg-emerald-900/75 text-amber-300 font-bold ring-2 ring-amber-400/80 shadow-xl"
                            : "border-white/20 bg-emerald-950/80 text-slate-300 hover:bg-emerald-900/50 hover:border-amber-400/50 hover:text-white shadow-md"
                        }`}
                      >
                        <div className="text-xs uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 mb-3">
                          Level {diff.level}
                        </div>
                        <div
                          className="text-base font-bold text-white"
                          style={{ letterSpacing: "0.035em" }}
                        >
                          {diff.name}
                        </div>
                        <div
                          className="text-xs text-slate-200 mt-2.5 leading-relaxed font-normal"
                          style={{ letterSpacing: "0.025em" }}
                        >
                          {diff.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM NAVIGATION & SUMMARY BAR */}
        <div className="max-w-4xl w-full mx-auto pt-4 border-t border-white/20 h-16 flex items-center justify-between gap-4">
          {/* Current Selection Summary Pill */}
          <div className="text-xs text-slate-100 flex items-center gap-2.5 bg-emerald-950/85 px-4 h-12 rounded-xl border border-white/15 tracking-wide min-w-0">
            <span
              className="font-semibold px-3 py-1 rounded-md border text-white whitespace-nowrap flex-shrink-0"
              style={{
                background: `color-mix(in srgb, ${activePermitColor} 55%, #14221d)`,
                borderColor: `color-mix(in srgb, ${activePermitColor} 75%, rgba(255,255,255,0.3))`,
                letterSpacing: "0.035em",
              }}
            >
              {permits[selectedPermit]?.label}
            </span>
            <span className="text-slate-400 flex-shrink-0">•</span>
            <span className="text-amber-300 font-semibold truncate">
              {currentDestination.name}
            </span>
            <span className="text-slate-400 flex-shrink-0">•</span>
            <span className="text-slate-200 font-medium whitespace-nowrap flex-shrink-0">
              Level {selectedDifficulty}
            </span>
          </div>

          {/* Step Navigation Buttons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="h-12 px-5 rounded-xl bg-emerald-950/85 hover:bg-emerald-900 border border-white/25 text-slate-100 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer tracking-wider whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                <span>Back</span>
              </button>
            )}

            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="h-12 px-7 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-emerald-950 font-chakra font-bold text-sm shadow-xl shadow-black/30 hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 border-2 border-amber-200 cursor-pointer tracking-wider whitespace-nowrap"
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4 flex-shrink-0" />
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="h-12 px-7 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-emerald-950 font-chakra font-bold text-sm shadow-xl shadow-black/30 hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 border-2 border-amber-200 cursor-pointer tracking-wider whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-current flex-shrink-0" />
                <span>START PARKING MISSION</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
