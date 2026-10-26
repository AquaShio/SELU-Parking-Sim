# SELU ParkSim

Campus parking driving simulation minigame for Southeastern Louisiana University (CMPS 4550/5550 — Team Fantastic Four).

```
selu-parksim/
├── frontend/   React 18 + HTML5 2D Canvas driving game with authentic HUD & audio
└── backend/    Python FastAPI server (SQLite DB, Concept3D map data, anonymous cookie sessions, 10Hz telemetry, CSV export)
```

## Quick Start

### 1. Start the Backend
```bash
cd backend
.venv/Scripts/activate        # On Windows (.venv is already configured)
uvicorn app.main:app --app-dir backend --reload --port 8000
```
- API Health: http://127.0.0.1:8000/api/health
- Swagger Docs: http://127.0.0.1:8000/docs
- Run tests: `pytest backend/tests`

### 2. Start the Frontend
```bash
cd frontend
npm run dev
```
- Game URL: http://127.0.0.1:5173

## Game Features
- **Authentic Campus Map**: Modeled on Southeastern's official Concept3D map, linking North Campus (University Center, Cook Field) down North Oak Street to Main Campus (Fayard Hall, Student Union, Friendship Circle).
- **Dynamic 4-Tier Permits**: Freshman Commuter, Upperclass Commuter, Faculty & Staff, and Residence Hall zones with dynamic HUD stall highlighting (green legal, amber occupied, red warning).
- **Vehicle Dynamics & Procedural Sound**: Top-down bicycle car kinematics, tire friction, drifting, and real-time Web Audio API engine oscillator, tire screeches, honk, and victory fanfare.
- **Timed Destination Missions**: Beat the morning clock to reach class at Fayard Hall or the Student Union while obeying 15-20 mph speed zones and pedestrian crosswalks. 3 strikes and you're ticketed!
- **Coursework Telemetry**: Automatic 10Hz sampling (speed, steering angle, throttle/brake, coordinates) with one-click CSV export on the debrief screen.
