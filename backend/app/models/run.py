"""
models/run.py — the Run table.

Columns:
  id, player_id (FK -> Player)
  map_id, permit_type, difficulty
  started_at, finished_at
  result          "parked" | "timeout" | "game_over" | "quit"
  time_to_park    seconds
  strikes         int
  alignment_offset
  score

Relationships: one Run has many TelemetrySamples and many GameEvents.
"""
