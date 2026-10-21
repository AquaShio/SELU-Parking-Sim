"""
schemas/map.py — JSON shapes for the map, so the front end and back end agree.

  Lot:        id, name, lot_type, polygon/rect, stalls: list[Stall]
  Stall:      id, x, y, width, height, angle
  SpeedZone:  id, limit_mph, rect
  Crosswalk:  id, rect
  MapOut:     id, name, width, height, spawn, roads, lots, speed_zones, crosswalks
"""
