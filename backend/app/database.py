"""
database.py — the SQLite connection.

What goes here:
  - engine:        SQLAlchemy engine built from settings.database_url
  - SessionLocal:  a factory that makes a DB session per request
  - Base:          the parent class every table in models/ inherits from
  - get_db():      a FastAPI dependency that opens a session, yields it to the
                   route, then closes it

SQLite is just a file (parksim.db) next to this folder, so there's nothing to
install for the demo laptop.
"""
