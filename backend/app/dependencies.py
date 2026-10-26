import datetime
import uuid
from fastapi import Depends, Request, Response
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.player import Player


def get_current_player(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> Player:
    cookie_id = request.cookies.get(settings.cookie_name)
    player = None

    if cookie_id:
        player = db.query(Player).filter(Player.id == cookie_id).first()

    now = datetime.datetime.now(datetime.timezone.utc)
    if player:
        player.last_seen = now
        db.commit()
    else:
        new_id = str(uuid.uuid4())
        player = Player(id=new_id, created_at=now, last_seen=now)
        db.add(player)
        db.commit()
        db.refresh(player)

        max_age_seconds = settings.cookie_max_age_days * 24 * 60 * 60
        response.set_cookie(
            key=settings.cookie_name,
            value=new_id,
            max_age=max_age_seconds,
            httponly=False,
            samesite="lax",
            path="/",
        )

    return player
