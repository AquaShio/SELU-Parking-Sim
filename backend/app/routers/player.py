"""
routers/player.py — who is playing.

Routes (all start with /api/player):
  GET  /api/player          -> returns the current player (creates one + sets
                               cookie on first visit) and their best scores
  POST /api/player/reset    -> clears the cookie / starts fresh (handy for testing)
"""
