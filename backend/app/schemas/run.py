import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class RunStart(BaseModel):
    map_id: str
    permit_type: str  # "freshman" | "upperclass" | "faculty" | "resident"
    difficulty: int = 1
    destination_building: Optional[str] = None


class RunFinish(BaseModel):
    result: str  # "parked" | "timeout" | "game_over" | "quit"
    time_to_park: Optional[float] = None  # seconds
    strikes: int = 0
    alignment_offset: Optional[float] = 0.0
    stalls_scanned: Optional[int] = 0


class RunOut(BaseModel):
    id: int
    player_id: str
    map_id: str
    permit_type: str
    difficulty: int
    destination_building: Optional[str] = None
    started_at: datetime.datetime
    finished_at: Optional[datetime.datetime] = None
    result: Optional[str] = None
    time_to_park: Optional[float] = None
    strikes: int = 0
    alignment_offset: Optional[float] = None
    score: int = 0

    model_config = ConfigDict(from_attributes=True)
