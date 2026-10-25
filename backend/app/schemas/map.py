from typing import List, Optional
from pydantic import BaseModel


class Stall(BaseModel):
    id: str
    lot_id: str
    x: float
    y: float
    width: float
    height: float
    angle: float = 0.0
    stall_type: str = "commuter"  # freshman, upperclass, faculty, resident, visitor, ada


class Lot(BaseModel):
    id: str
    name: str
    lot_type: str  # freshman, upperclass, faculty, resident, visitor, general
    color: str = "#00573D"
    polygon: List[List[float]]  # [[x, y], [x, y], ...]
    stalls: List[Stall] = []


class SpeedZone(BaseModel):
    id: str
    name: str = "Campus Zone"
    limit_mph: float = 15.0
    rect: List[float]  # [x, y, w, h]


class Crosswalk(BaseModel):
    id: str
    name: str = "Pedestrian Crosswalk"
    rect: List[float]  # [x, y, w, h]
    angle: float = 0.0


class Road(BaseModel):
    id: str
    name: str
    points: List[List[float]]
    width: float = 40.0


class Building(BaseModel):
    id: str
    name: str
    rect: List[float]  # [x, y, w, h]
    polygon: Optional[List[List[float]]] = None
    color: str = "#2D3748"
    label: str = ""


class SpawnPoint(BaseModel):
    x: float
    y: float
    heading: float = 0.0  # degrees


class Destination(BaseModel):
    id: str
    name: str
    building_id: str
    target_lot_ids: List[str]
    description: str = ""
    time_limit_s: int = 90
    spawn: Optional[SpawnPoint] = None


class Tree(BaseModel):
    x: float
    y: float
    radius: float = 13.5


class MapOut(BaseModel):
    id: str
    name: str
    description: str
    width: float
    height: float
    tile_zoom: int = 19
    tile_origin_x: int = 130375
    tile_origin_y: int = 215420
    render_boundary: List[List[float]] = []
    spawn: SpawnPoint
    roads: List[Road] = []
    lots: List[Lot] = []
    speed_zones: List[SpeedZone] = []
    crosswalks: List[Crosswalk] = []
    buildings: List[Building] = []
    trees: List[Tree] = []
    destinations: List[Destination] = []
