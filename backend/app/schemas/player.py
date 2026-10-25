import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PlayerOut(BaseModel):
    id: str
    created_at: datetime.datetime
    runs_played: int = 0
    best_score: int = 0
    last_run_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)
