"""
config.py — one place for settings.

What goes here:
  A Settings class (from pydantic_settings) that reads .env:
    database_url, frontend_origin, cookie_name, cookie_max_age_days
  and one shared `settings = Settings()` object the rest of the app imports.

Why: so nothing like "localhost:5173" or the DB path is hard-coded in 5 places.
"""
