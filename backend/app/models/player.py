"""
models/player.py — the Player table.

Columns:
  id          string UUID (this is what the cookie stores)
  created_at  datetime
  last_seen   datetime

Relationship: one Player has many Runs.
"""
