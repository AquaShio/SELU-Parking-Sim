# ParkSim Backend (FastAPI)

Python server for SELU ParkSim. It does four jobs:

1. **Serves the map and rules.** Lots, stalls, speed zones, crosswalks, permits and difficulty, all read from JSON in `data/`.
2. **Tracks the player with a cookie.** No login. The cookie holds only an anonymous ID.
3. **Records runs.** Start, finish, result and score for each parking attempt.
4. **Records telemetry.** The "Data recorded" rows from the storyboard: speed, steering, braking, events and so on.

The game itself (driving, drawing, collisions) runs in React on a 2D canvas. The backend is
where data comes from and gets saved.

## Folder layout

```
backend/
├── app/
│   ├── main.py            creates the app, CORS, includes routers, /api/health
│   ├── config.py          settings read from .env
│   ├── database.py        SQLite engine, sessions, Base class, get_db()
│   ├── dependencies.py    get_current_player(): reads or creates the cookie
│   │
│   ├── routers/           URL endpoints, grouped by topic
│   │   ├── player.py        /api/player
│   │   ├── maps.py          /api/maps
│   │   ├── runs.py          /api/runs
│   │   └── telemetry.py     /api/runs/{id}/telemetry, /events, /export.csv
│   │
│   ├── models/            DATABASE TABLES (SQLAlchemy)
│   │   ├── player.py        Player
│   │   ├── run.py           Run
│   │   └── telemetry.py     TelemetrySample, GameEvent
│   │
│   ├── schemas/           JSON SHAPES in and out (Pydantic)
│   │   ├── player.py
│   │   ├── run.py
│   │   ├── telemetry.py
│   │   └── map.py
│   │
│   └── services/          game logic that isn't tied to a URL
│       ├── map_loader.py    reads data/*.json
│       ├── permits.py       can_park(permit, lot)
│       └── scoring.py       calculate_score(...)
│
├── data/
│   ├── maps/              one JSON file per campus map
│   └── config/            permits.json, difficulty.json
│
├── tests/                 pytest tests
├── requirements.txt
└── .env.example           copy to .env
```

### models vs schemas (the one that confuses everyone)
- **models/** = how data is **stored** (database columns).
- **schemas/** = how data **travels** (the JSON the React app sends and receives).

They often look alike, but keeping them separate means you can change the database
without breaking the front end.

### How a request flows
```
React game  ──POST /api/runs/42/telemetry──▶  routers/telemetry.py
                                                 │ checks the JSON against schemas/telemetry.py
                                                 │ gets the player from dependencies.py (cookie)
                                                 │ gets a db session from database.py
                                                 ▼
                                             models/telemetry.py ──▶ parksim.db
```

## Why only an ID goes in the cookie
A browser cookie holds about 4 KB. Ten samples a second over a two-minute run comes to
over a thousand rows, which won't fit. So the cookie stores `parksim_player=<uuid>`, and
everything else is saved in SQLite under that UUID. As long as the same browser keeps the
cookie, the player keeps their history.

## Running it (once the code is written)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```
- API: http://localhost:8000/api/health
- Auto docs: http://localhost:8000/docs. You can try every route from this page, so the React team can test it without asking you.

## Suggested build order
1. `config.py`, then `main.py` with `/api/health`, then `tests/test_health.py`. Confirm the server runs.
2. `database.py`, then `models/player.py`, then `dependencies.py`, then `routers/player.py`. Confirm the cookie works.
3. `schemas/map.py`, then `services/map_loader.py`, then `routers/maps.py`, plus a first map JSON.
4. Runs: model, schema, router, then `services/scoring.py` and `services/permits.py`.
5. Telemetry: model, schema, router, then the CSV export.
