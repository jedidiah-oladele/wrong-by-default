"""
FastAPI server for OpenAI Realtime API integration.
Production-grade setup with logging, error handling, and structured configuration.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from config import get_settings
from src.api import shared
from src.api.routes import health, usage, realtime

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

settings = get_settings()

# Initialize shared storage and usage tracker
shared.initialize_shared_instances(
    mongodb_url=settings.mongodb_url,
    mongodb_database=settings.mongodb_database,
    token_limit=settings.token_limit_per_ip,
    reset_period_hours=settings.token_reset_period_hours,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    logger.info("Starting server...")
    logger.info(f"Server will run on port {settings.port}")
    logger.info(f"Frontend URL: {settings.frontend_url}")

    # Pre-connect to MongoDB at startup
    if shared.storage is None or shared.usage_tracker is None:
        raise RuntimeError(
            "Storage and usage_tracker must be initialized before startup"
        )

    try:
        await shared.storage._connect()
        logger.info("MongoDB connection established at startup")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB at startup: {e}", exc_info=True)
        raise

    yield
    # Shutdown
    logger.info("Shutting down server...")
    if shared.usage_tracker:
        await shared.usage_tracker.close()


app = FastAPI(
    title="Wrong by Default API",
    description="Voice AI that pushes back on your thinking - OpenAI Realtime API integration server",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(usage.router)
app.include_router(realtime.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=settings.port,
        log_level="info",
        reload=settings.debug,
    )
