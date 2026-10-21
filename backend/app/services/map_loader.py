"""
services/map_loader.py — reads the JSON files in data/.

What goes here:
  load_map(map_id)      -> open data/maps/{map_id}.json, validate with MapOut
  list_maps()           -> every .json in data/maps/
  load_permits()        -> data/config/permits.json
  load_difficulty()     -> data/config/difficulty.json

Cache results so we don't re-read the file on every request.
"""
