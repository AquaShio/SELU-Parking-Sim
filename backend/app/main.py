from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
import app.models  # Ensure all tables are registered with Base.metadata
from app.routers import player, maps, runs, telemetry

# Ensure tables are created immediately
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="SELU ParkSim Backend",
    description="FastAPI service powering Southeastern Louisiana University Parking Simulator minigame",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
origins = [
    settings.frontend_origin,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(player.router, prefix="/api")
app.include_router(maps.router, prefix="/api")
app.include_router(runs.router, prefix="/api")
app.include_router(telemetry.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "SELU ParkSim"}
