from sqlalchemy import Column, Integer, Float, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class TelemetrySample(Base):
    __tablename__ = "telemetry_samples"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False, index=True)
    t = Column(Float, nullable=False)  # seconds since run start
    speed_mph = Column(Float, default=0.0, nullable=False)
    steering_angle = Column(Float, default=0.0, nullable=False)
    throttle = Column(Float, default=0.0, nullable=False)
    brake = Column(Float, default=0.0, nullable=False)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    heading = Column(Float, default=0.0, nullable=False)
    lane_offset = Column(Float, default=0.0, nullable=True)

    run = relationship("Run", back_populates="telemetry_samples")


class GameEvent(Base):
    __tablename__ = "game_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False, index=True)
    t = Column(Float, nullable=False)  # seconds since run start
    event_type = Column(String(50), nullable=False)  # e.g. "speeding", "curb_collision", "crosswalk_stop", "parked"
    details = Column(Text, nullable=True)  # JSON text

    run = relationship("Run", back_populates="events")
