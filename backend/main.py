import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from database import init_db
from routes import campaigns_router
from character_routes import router as character_router
from session_routes import router as session_router
from event_routes import router as event_router
from player_routes import router as player_router
from scene_routes import router as scene_router
from map_marker_routes import router as map_marker_router
from notebook_routes import router as notebook_router
from ai_routes import router as ai_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("roleito")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Starting Roleito API...")
    await init_db()
    logger.info("Database initialized")
    yield
    logger.info("Shutting down Roleito API")


app = FastAPI(
    title="Roleito API",
    description="Persistent AI RPG World Engine — Backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "Resource not found"},
    )


app.include_router(campaigns_router, prefix="/api")
app.include_router(character_router, prefix="/api")
app.include_router(session_router, prefix="/api")
app.include_router(event_router, prefix="/api")
app.include_router(player_router, prefix="/api")
app.include_router(scene_router, prefix="/api")
app.include_router(map_marker_router, prefix="/api")
app.include_router(notebook_router, prefix="/api")
app.include_router(ai_router, prefix="/api")

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)
app.mount("/api/static", StaticFiles(directory=ASSETS_DIR), name="static")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
