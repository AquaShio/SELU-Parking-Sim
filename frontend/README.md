# SELU ParkSim Frontend

React 18 + HTML5 Canvas 2D campus parking driving simulator.

## Running the Dev Server
```bash
npm run dev
```
Runs at http://localhost:5173 with automatic proxying to the FastAPI backend at `http://localhost:8000/api`.

## Production Build
```bash
npm run build
```

## Key Modules
- `src/game/physics.js`: 2D bicycle car physics with steering kinematics, tire grip, and stall alignment calculation.
- `src/game/renderer.js`: HTML5 Canvas 2D campus renderer (Concept3D styled roads, crosswalks, lots, stalls, pedestrians, AI traffic, player car).
- `src/game/sound.js`: Web Audio API synthesizer for engine RPM, tire screeches, horns, strike buzzers, and victory fanfares.
- `src/game/telemetryCollector.js`: 10Hz sample buffer syncing to backend `/api/runs/{id}/telemetry`.
- `src/components/HUD.jsx`: Digital speedometer, speed zone limit sign, golden compass, timer, strikes, and docking progress bar.
- `src/components/MissionSelect.jsx`: Southeastern branded permit selection, mission selector, and career stats.
- `src/components/DebriefModal.jsx`: Post-mission score breakdown, confetti celebration, and CSV telemetry download.
