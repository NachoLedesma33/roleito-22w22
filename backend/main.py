import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import init_db
from routes import campaigns_router
from character_routes import router as character_router
from session_routes import router as session_router

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


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
