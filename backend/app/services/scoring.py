"""
services/scoring.py — turns a finished run into a score.

What goes here:
  calculate_score(run_finish, difficulty) -> int

Rules from the storyboard to build on:
  - base points for parking successfully
  - bonus for time remaining
  - bonus for good alignment
  - minus points per strike
  - level 1: first timeout miss has no penalty, second costs 5

Keeping this on the server means the formula lives in one place.
"""
