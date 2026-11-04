import shutil
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
EXISTING_TILES_DIR = BACKEND_DIR / "data" / "tiles"
RAW_TILES_DIR = BACKEND_DIR / "data" / "raw_tiles"
COLLISION_TILES_DIR = BACKEND_DIR / "data" / "collision_tiles"

RAW_TILES_DIR.mkdir(parents=True, exist_ok=True)
COLLISION_TILES_DIR.mkdir(parents=True, exist_ok=True)

existing_files = list(EXISTING_TILES_DIR.glob("*.webp"))

if existing_files:
    for file_path in existing_files:
        shutil.copy2(file_path, RAW_TILES_DIR / file_path.name)
        shutil.copy2(file_path, COLLISION_TILES_DIR / file_path.name)
    print(f"Successfully set up {len(existing_files)} tiles in 'raw_tiles' and 'collision_tiles'!")
else:
    print("No cached tiles found in backend/data/tiles/ yet.")