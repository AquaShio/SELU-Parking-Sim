"""
main.py — the front door of the backend.

This is the file uvicorn runs:   uvicorn app.main:app --reload

What goes here:
  1. Create the FastAPI app object.
  2. Turn on CORS so the React dev server (localhost:5173) is allowed to call us.
  3. Create the database tables on startup (from database.py + models/).
  4. "include" each router from routers/ under the /api prefix.
  5. A tiny GET /api/health route that returns {"status": "ok"} so you can check
     the server is alive.

Keep this file short. Real logic lives in routers/ and services/.
"""
