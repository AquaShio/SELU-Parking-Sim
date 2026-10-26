from app.schemas.run import RunFinish
from app.services.map_loader import load_difficulty


def calculate_score(run_finish: RunFinish, difficulty: int = 1) -> int:
    if run_finish.result != "parked":
        # Disqualified or timed out
        base_score = 100 if run_finish.result == "timeout" else 0
        penalty = run_finish.strikes * 150
        return max(0, base_score - penalty)

    diff_config = load_difficulty()
    level_info = diff_config.get("levels", {}).get(str(difficulty), {})
    time_limit = level_info.get("time_limit_s", 90)

    # 1. Base success score
    score = 1000

    # 2. Time remaining bonus (faster = more points)
    if run_finish.time_to_park is not None and run_finish.time_to_park < time_limit:
        time_remaining = time_limit - run_finish.time_to_park
        score += int(time_remaining * 15)

    # 3. Alignment accuracy bonus
    if run_finish.alignment_offset is not None:
        # 0 offset = +300 bonus, offset up to 1.0 reduces bonus
        alignment_score = max(0, int((1.0 - min(1.0, run_finish.alignment_offset)) * 300))
        score += alignment_score

    # 4. Strike penalty (-250 per strike)
    score -= run_finish.strikes * 250

    # 5. Difficulty multiplier
    multiplier = 1.0 + (difficulty - 1) * 0.25
    final_score = int(score * multiplier)

    return max(0, final_score)
