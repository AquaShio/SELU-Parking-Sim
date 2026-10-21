"""
models/telemetry.py — the TelemetrySample and GameEvent tables.

TelemetrySample columns:
  id, run_id (FK), t (seconds since run start),
  speed_mph, steering_angle, throttle, brake, x, y, heading, lane_offset

GameEvent columns:
  id, run_id (FK), t, event_type, details (JSON text)
"""
