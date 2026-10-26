from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.config import settings
from app.database import get_db
from app.dependencies import get_current_player
from app.models.player import Player
from app.models.run import Run
from app.schemas.player import PlayerOut

router = APIRouter(prefix="/player", tags=["Player"])


@router.get("", response_model=PlayerOut)
def get_player(
    player: Player = Depends(get_current_player),
    db: Session = Depends(get_db),
):
    stats = (
        db.query(
            func.count(Run.id).label("runs_played"),
            func.coalesce(func.max(Run.score), 0).label("best_score"),
            func.max(Run.finished_at).label("last_run_at"),
        )
        .filter(Run.player_id == player.id)
        .first()
    )

    return PlayerOut(
        id=player.id,
        created_at=player.created_at,
        runs_played=stats.runs_played if stats else 0,
        best_score=stats.best_score if stats else 0,
        last_run_at=stats.last_run_at if stats else None,
    )


@router.post("/reset")
def reset_player(response: Response):
    response.delete_cookie(key=settings.cookie_name, path="/")
    return {"message": "Player cookie cleared. Next request will generate a fresh player ID."}
