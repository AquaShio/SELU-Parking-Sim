from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class TelemetrySampleIn(BaseModel):
    t: float
    speed_mph: float = 0.0
    steering_angle: float = 0.0
    throttle: float = 0.0
    brake: float = 0.0
    x: float
    y: float
    heading: float = 0.0
    lane_offset: Optional[float] = 0.0


class TelemetryBatchIn(BaseModel):
    samples: List[TelemetrySampleIn]


class GameEventIn(BaseModel):
    t: float
    event_type: str
    details: Optional[Dict[str, Any]] = None


class TelemetrySampleOut(BaseModel):
    id: int
    run_id: int
    t: float
    speed_mph: float
    steering_angle: float
    throttle: float
    brake: float
    x: float
    y: float
    heading: float
    lane_offset: Optional[float] = 0.0


class GameEventOut(BaseModel):
    id: int
    run_id: int
    t: float
    event_type: str
    details: Optional[str] = None
