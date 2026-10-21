"""
routers/telemetry.py — the "Data recorded" rows from the storyboard.

Routes:
  POST /api/runs/{run_id}/telemetry   -> the game sends a BATCH of samples
                                         every ~1–2 seconds (not every frame!)
  POST /api/runs/{run_id}/events      -> one-off events: strike, permit check,
                                         collision, crosswalk violation, speeding
  GET  /api/runs/{run_id}/export.csv  -> download one run's data for analysis

Sample  = continuous stuff: timestamp, speed, steering angle, throttle,
          brake, x/y position, lane position.
Event   = something happened: type ("strike", "permit_denied", ...),
          timestamp, and a details dict (lot type, speed limit, etc.).
"""
