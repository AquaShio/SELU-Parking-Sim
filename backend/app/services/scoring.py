from app.schemas.run import RunFinish
from app.services.map_loader import load_difficulty


def calculate_score_breakdown(run_finish: RunFinish, difficulty: int = 1) -> tuple[int, list[dict]]:
    """Return (final_score, line items) so the debrief screen can show how the score was built."""
    items: list[dict] = []

    if run_finish.result != "parked":
        # Disqualified or timed out
        base_score = 100 if run_finish.result == "timeout" else 0
        penalty = run_finish.strikes * 150
        if base_score:
            items.append({"label": "Timeout consolation", "points": base_score})
        if penalty:
            items.append({"label": f"Strikes ({run_finish.strikes} x 150)", "points": -penalty})
        final = max(0, base_score - penalty)
        return final, items

    diff_config = load_difficulty()
    level_info = diff_config.get("levels", {}).get(str(difficulty), {})
    time_limit = level_info.get("time_limit_s", 90)

    # 1. Base success score
    score = 1000
    items.append({"label": "Parked legally", "points": 1000})

    # 2. Time remaining bonus (faster = more points)
    if run_finish.time_to_park is not None and run_finish.time_to_park < time_limit:
        time_remaining = time_limit - run_finish.time_to_park
        bonus = int(time_remaining * 15)
        score += bonus
        items.append({"label": f"Time bonus ({int(time_remaining)}s left x 15)", "points": bonus})

    # 3. Alignment accuracy bonus
    if run_finish.alignment_offset is not None:
        # 0 offset = +300 bonus, offset up to 1.0 reduces bonus
        alignment_score = max(0, int((1.0 - min(1.0, run_finish.alignment_offset)) * 300))
        score += alignment_score
        items.append({"label": "Stall alignment", "points": alignment_score})

    # 4. Strike penalty (-250 per strike)
    if run_finish.strikes:
        score -= run_finish.strikes * 250
        items.append({"label": f"Strikes ({run_finish.strikes} x 250)", "points": -run_finish.strikes * 250})

    # 5. Difficulty multiplier
    multiplier = 1.0 + (difficulty - 1) * 0.25
    final_score = int(score * multiplier)
    if multiplier != 1.0:
        items.append({"label": f"Difficulty x{multiplier:g}", "points": final_score - score})

    return max(0, final_score), items


def calculate_score(run_finish: RunFinish, difficulty: int = 1) -> int:
    return calculate_score_breakdown(run_finish, difficulty)[0]
