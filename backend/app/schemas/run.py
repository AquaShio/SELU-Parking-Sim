"""
schemas/run.py — JSON shapes for runs.

  RunStart:   map_id, permit_type, difficulty          (what the game sends)
  RunFinish:  result, time_to_park, strikes, alignment_offset
  RunOut:     everything about a run, including score  (what we send back)
"""
