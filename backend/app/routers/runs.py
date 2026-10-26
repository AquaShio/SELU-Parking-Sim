import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_player
from app.models.player import Player
from app.models.run import Run
from app.schemas.run import RunStart, RunFinish, RunOut
from app.services.scoring import calculate_score

router = APIRouter(prefix="/runs", tags=["Runs"])


@router.post("", response_model=RunOut)
def start_run(
    data: RunStart,
    player: Player = Depends(get_current_player),
    db: Session = Depends(get_db),
):
    now = datetime.datetime.now(datetime.timezone.utc)
    run = Run(
        player_id=player.id,
        map_id=data.map_id,
        permit_type=data.permit_type,
        difficulty=data.difficulty,
        destination_building=data.destination_building,
        started_at=now,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


@router.post("/{run_id}/finish", response_model=RunOut)
def finish_run(
    run_id: int,
    data: RunFinish,
    player: Player = Depends(get_current_player),
    db: Session = Depends(get_db),
):
    run = db.query(Run).filter(Run.id == run_id, Run.player_id == player.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    if run.finished_at is not None:
        return run

    run.finished_at = datetime.datetime.now(datetime.timezone.utc)
    run.result = data.result
    run.time_to_park = data.time_to_park
    run.strikes = data.strikes
    run.alignment_offset = data.alignment_offset
    run.score = calculate_score(data, run.difficulty)

    db.commit()
    db.refresh(run)
    return run


@router.get("", response_model=List[RunOut])
def get_player_runs(
    player: Player = Depends(get_current_player),
    db: Session = Depends(get_db),
    limit: int = 20,
):
    runs = (
        db.query(Run)
        .filter(Run.player_id == player.id)
        .order_by(Run.started_at.desc())
        .limit(limit)
        .all()
    )
    return runs


@router.get("/{run_id}", response_model=RunOut)
def get_run(
    run_id: int,
    player: Player = Depends(get_current_player),
    db: Session = Depends(get_db),
):
    run = db.query(Run).filter(Run.id == run_id, Run.player_id == player.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run
