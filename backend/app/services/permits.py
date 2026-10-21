"""
services/permits.py — the permit check from Scenes 2 and 3.

What goes here:
  can_park(permit_type, lot_type) -> bool
    Uses data/config/permits.json. True = "Permit verified",
    False = "Permit denied" + strike.

The front end can do the same check for instant feedback, but the server
double-checks when the run is finished.
"""
