import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)


class Run(Base):
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    player_id = Column(String(36), ForeignKey("players.id"), nullable=False, index=True)
    map_id = Column(String(50), nullable=False)
    permit_type = Column(String(50), nullable=False)
    difficulty = Column(Integer, default=1, nullable=False)
    destination_building = Column(String(100), nullable=True)

    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    finished_at = Column(DateTime(timezone=True), nullable=True)

    result = Column(String(20), nullable=True)  # "parked" | "timeout" | "game_over" | "quit"
    time_to_park = Column(Float, nullable=True)  # seconds
    strikes = Column(Integer, default=0, nullable=False)
    alignment_offset = Column(Float, nullable=True)
    score = Column(Integer, default=0, nullable=False)

    player = relationship("Player", back_populates="runs")
    telemetry_samples = relationship("TelemetrySample", back_populates="run", cascade="all, delete-orphan")
    events = relationship("GameEvent", back_populates="run", cascade="all, delete-orphan")
