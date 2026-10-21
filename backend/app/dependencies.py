"""
dependencies.py — small reusable helpers routes can ask for.

What goes here:
  get_current_player(request, response, db)
    1. Look for the player cookie (settings.cookie_name) on the request.
    2. If it exists and matches a Player row, return that player.
    3. If not, create a new Player with a random UUID, set the cookie on the
       response (httponly, samesite="lax"), and return the new player.

This is how "saved as a cookie" works: the cookie only stores the player's ID,
and the real data lives in the database under that ID.
"""
