"""
routers/maps.py — the campus map and game rules the front end draws.

Routes (all start with /api/maps):
  GET /api/maps              -> list of available maps (id + name)
  GET /api/maps/{map_id}     -> the full map: roads, lots (with lot type),
                                stalls, speed zones, crosswalks, spawn point
  GET /api/maps/config/permits     -> permit types + which lots each can use
  GET /api/maps/config/difficulty  -> time limits, strikes, crowding per level

The data comes from JSON files in data/ (loaded by services/map_loader.py),
so the team can edit the map without touching Python.
"""
