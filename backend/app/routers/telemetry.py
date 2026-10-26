import csv
import io
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_player
from app.models.player import Player
from app.models.run import Run
from app.models.telemetry import TelemetrySample, GameEvent
from app.schemas.telemetry import (
    TelemetryBatchIn,
    GameEventIn,
    TelemetrySampleOut,
    GameEventOut,
)

router = APIRouter(prefix="/runs", tags=["Telemetry"])


@router.post("/{run_id}/telemetry", response_model=dict)
def save_telemetry_batch(
    run_id: int,
    batch: TelemetryBatchIn,
    player: Player = Depends(get_current_player),
    db: Session = Depends(get_db),
):
    run = db.query(Run).filter(Run.id == run_id, Run.player_id == player.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    samples_to_add = [
        TelemetrySample(
            run_id=run_id,
            t=s.t,
            speed_mph=s.speed_mph,
            steering_angle=s.steering_angle,
            throttle=s.throttle,
            brake=s.brake,
            x=s.x,
            y=s.y,
            heading=s.heading,
            lane_offset=s.lane_offset,
        )
        for s in batch.samples
    ]

    db.bulk_save_objects(samples_to_add)
    db.commit()
    return {"saved_samples": len(samples_to_add)}


@router.post("/{run_id}/events", response_model=dict)
def log_event(
    run_id: int,
    event_in: GameEventIn,
    player: Player = Depends(get_current_player),
    db: Session = Depends(get_db),
):
    run = db.query(Run).filter(Run.id == run_id, Run.player_id == player.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    details_json = json.dumps(event_in.details) if event_in.details else None
    event_record = GameEvent(
        run_id=run_id,
        t=event_in.t,
        event_type=event_in.event_type,
        details=details_json,
    )
    db.add(event_record)
    db.commit()
    return {"status": "logged", "event_id": event_record.id}


@router.get("/{run_id}/telemetry", response_model=List[TelemetrySampleOut])
def get_run_telemetry(
    run_id: int,
    player: Player = Depends(get_current_player),
    db: Session = Depends(get_db),
):
    run = db.query(Run).filter(Run.id == run_id, Run.player_id == player.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    samples = (
        db.query(TelemetrySample)
        .filter(TelemetrySample.run_id == run_id)
        .order_by(TelemetrySample.t.asc())
        .all()
    )
    return samples


@router.get("/{run_id}/events", response_model=List[GameEventOut])
def get_run_events(
    run_id: int,
    player: Player = Depends(get_current_player),
    db: Session = Depends(get_db),
):
    run = db.query(Run).filter(Run.id == run_id, Run.player_id == player.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    events = (
        db.query(GameEvent)
        .filter(GameEvent.run_id == run_id)
        .order_by(GameEvent.t.asc())
        .all()
    )
    return events


@router.get("/{run_id}/export.csv")
def export_run_csv(
    run_id: int,
    player: Player = Depends(get_current_player),
    db: Session = Depends(get_db),
):
    run = db.query(Run).filter(Run.id == run_id, Run.player_id == player.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    samples = (
        db.query(TelemetrySample)
        .filter(TelemetrySample.run_id == run_id)
        .order_by(TelemetrySample.t.asc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # Write Run metadata header
    writer.writerow(["# SELU ParkSim Telemetry Export"])
    writer.writerow(["# Run ID", run.id])
    writer.writerow(["# Player ID", run.player_id])
    writer.writerow(["# Map ID", run.map_id])
    writer.writerow(["# Permit Type", run.permit_type])
    writer.writerow(["# Difficulty", run.difficulty])
    writer.writerow(["# Result", run.result or "in_progress"])
    writer.writerow(["# Final Score", run.score])
    writer.writerow(["# Strikes", run.strikes])
    writer.writerow([])

    # Telemetry columns
    writer.writerow([
        "timestamp_s",
        "speed_mph",
        "steering_angle_deg",
        "throttle",
        "brake",
        "x_coord",
        "y_coord",
        "heading_deg",
        "lane_offset",
    ])

    for s in samples:
        writer.writerow([
            round(s.t, 2),
            round(s.speed_mph, 1),
            round(s.steering_angle, 2),
            round(s.throttle, 2),
            round(s.brake, 2),
            round(s.x, 1),
            round(s.y, 1),
            round(s.heading, 1),
            round(s.lane_offset or 0.0, 2),
        ])

    output.seek(0)
    filename = f"selu_parksim_run_{run_id}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
