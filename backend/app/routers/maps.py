from pathlib import Path
import urllib.request
from fastapi import APIRouter, HTTPException, Response
from typing import List, Dict, Any
from app.schemas.map import MapOut
from app.services.map_loader import load_map, list_maps, load_permits, load_difficulty

router = APIRouter(prefix="/maps", tags=["Maps"])

# Updated directory paths for raw rendering tiles and collision mask tiles
RAW_TILES_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "raw_tiles"
COLLISION_TILES_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "collision_tiles"

RAW_TILES_DIR.mkdir(parents=True, exist_ok=True)
COLLISION_TILES_DIR.mkdir(parents=True, exist_ok=True)


@router.get("", response_model=List[Dict[str, Any]])
def get_map_list():
    return list_maps()


@router.get("/config/permits")
def get_permits_config():
    return load_permits()


@router.get("/config/difficulty")
def get_difficulty_config():
    return load_difficulty()


@router.get("/tiles/{z}/{x}/{y_xyz}")
def get_concept3d_tile(z: int, x: int, y_xyz: int):
    if z < 14 or z > 21:
        raise HTTPException(status_code=400, detail="Invalid zoom level")

    # Serve visual map tiles directly from raw_tiles
    cache_file = RAW_TILES_DIR / f"{z}_{x}_{y_xyz}.webp"
    if cache_file.exists():
        data = cache_file.read_bytes()
        return Response(
            content=data,
            media_type="image/webp",
            headers={
                "Cache-Control": "public, max-age=604800",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
            },
        )

    y_tms = (2**z - 1) - y_xyz
    url = f"https://assets.concept3d.com/assets/2329/2329_Map_2_6a7e2bd2bd4ad/{z}/{x}/{y_tms}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = resp.read()
            cache_file.write_bytes(data)
            return Response(
                content=data,
                media_type="image/webp",
                headers={
                    "Cache-Control": "public, max-age=604800",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                },
            )
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Tile not found") from exc


@router.get("/{map_id}", response_model=MapOut)
def get_map_details(map_id: str):
    map_data = load_map(map_id)
    if not map_data:
        raise HTTPException(status_code=404, detail=f"Map '{map_id}' not found")
    return map_data