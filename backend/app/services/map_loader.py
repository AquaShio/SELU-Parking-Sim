import json
from pathlib import Path
from typing import Dict, List, Optional
from app.schemas.map import MapOut

MAPS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "maps"
CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "config"

_map_cache: Dict[str, MapOut] = {}
_map_mtime: Dict[str, float] = {}
_permits_cache: Optional[dict] = None
_permits_mtime: float = 0
_difficulty_cache: Optional[dict] = None
_difficulty_mtime: float = 0


def load_map(map_id: str) -> Optional[MapOut]:
    file_path = MAPS_DIR / f"{map_id}.json"
    if not file_path.exists():
        return None

    mtime = file_path.stat().st_mtime
    if map_id in _map_cache and _map_mtime.get(map_id) == mtime:
        return _map_cache[map_id]

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    validated_map = MapOut(**data)
    _map_cache[map_id] = validated_map
    _map_mtime[map_id] = mtime
    return validated_map


def list_maps() -> List[dict]:
    maps = []
    for file in MAPS_DIR.glob("*.json"):
        try:
            m = load_map(file.stem)
            if m:
                maps.append({
                    "id": m.id,
                    "name": m.name,
                    "description": m.description,
                    "lots_count": len(m.lots),
                    "destinations": [d.name for d in m.destinations]
                })
        except Exception:
            continue
    return maps


def load_permits() -> dict:
    global _permits_cache, _permits_mtime
    file_path = CONFIG_DIR / "permits.json"
    if file_path.exists():
        mtime = file_path.stat().st_mtime
        if _permits_cache is not None and _permits_mtime == mtime:
            return _permits_cache
        with open(file_path, "r", encoding="utf-8") as f:
            _permits_cache = json.load(f)
        _permits_mtime = mtime
    else:
        _permits_cache = {"permits": {}}
    return _permits_cache


def load_difficulty() -> dict:
    global _difficulty_cache, _difficulty_mtime
    file_path = CONFIG_DIR / "difficulty.json"
    if file_path.exists():
        mtime = file_path.stat().st_mtime
        if _difficulty_cache is not None and _difficulty_mtime == mtime:
            return _difficulty_cache
        with open(file_path, "r", encoding="utf-8") as f:
            _difficulty_cache = json.load(f)
        _difficulty_mtime = mtime
    else:
        _difficulty_cache = {"levels": {}}
    return _difficulty_cache
