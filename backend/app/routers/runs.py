"""
routers/runs.py — one "run" = one attempt at parking.

Routes (all start with /api/runs):
  POST /api/runs                 -> start a run (map, permit, difficulty).
                                    Returns a run_id the game keeps.
  POST /api/runs/{run_id}/finish -> end the run: result (parked / timed out /
                                    game over), time to park, strikes, alignment
                                    offset. Server computes the score.
  GET  /api/runs                 -> this player's past runs (history screen)
"""
