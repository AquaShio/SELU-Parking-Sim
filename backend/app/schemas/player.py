"""
schemas/player.py — the shape of player data sent to the front end.

Schemas are NOT database tables. They describe the JSON going in and out, and
FastAPI uses them to reject bad requests automatically.

  PlayerOut: id, created_at, best_score, runs_played
"""
