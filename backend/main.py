"""
FastAPI server for OpenAI Realtime API integration.
Production-grade setup with logging, error handling, and structured configuration.
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import aiohttp
from dotenv import load_dotenv

from config import get_settings
from prompts import get_instructions_for_mode

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    logger.info("Starting server...")
    logger.info(f"Server will run on port {settings.port}")
    logger.info(f"Frontend URL: {settings.frontend_url}")
    yield
    # Shutdown
    logger.info("Shutting down server...")


app = FastAPI(
    title="Wrong by Default API",
    description="OpenAI Realtime API integration server",
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


def get_session_config(mode_id: str) -> str:
    """Get session configuration based on mode."""
    import json

    base_config = {
        "type": "realtime",
        "model": settings.openai_model,
        "audio": {
            "output": {
                "voice": settings.openai_voice,
            }
        },
        "instructions": get_instructions_for_mode(mode_id),
    }
    return json.dumps(base_config)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "wrong-by-default-api"}


@app.post("/api/realtime/session")
async def create_session(request: Request):
    """Create a Realtime API session using the unified interface."""
    content_type = request.headers.get("content-type", "")
    client_ip = request.client.host if request.client else "unknown"

    logger.info(f"Session creation request from {client_ip}")

    # Handle both JSON and text/plain content types
    if "application/json" in content_type:
        try:
            body = await request.json()
            sdp = body.get("sdp")
            mode_id = body.get("modeId", "devils-advocate")
            logger.debug(f"Received JSON request with mode: {mode_id}")
        except Exception as e:
            logger.error(f"Invalid JSON in request: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    else:
        # Plain text SDP
        sdp = await request.body()
        sdp = sdp.decode("utf-8")
        # Try to get modeId from query params
        mode_id = request.query_params.get("modeId", "devils-advocate")
        logger.debug(f"Received text/plain request with mode: {mode_id}")

    if not sdp or not isinstance(sdp, str):
        logger.warning("SDP data missing or invalid in request")
        raise HTTPException(status_code=400, detail="SDP data is required")

    if not settings.openai_api_key:
        logger.error("OpenAI API key not configured")
        raise HTTPException(
            status_code=500, detail="Server configuration error: OpenAI API key not set"
        )

    session_config = get_session_config(mode_id)
    logger.info(f"Creating session for mode: {mode_id}")

    # Create FormData
    form_data = aiohttp.FormData()
    form_data.add_field("sdp", sdp)
    form_data.add_field("session", session_config)

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{settings.openai_api_base}/v1/realtime/calls",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                },
                data=form_data,
                timeout=aiohttp.ClientTimeout(total=30),
            ) as response:
                if not response.ok:
                    error_text = await response.text()
                    logger.error(
                        f"OpenAI API error: {response.status} - {error_text[:200]}"
                    )
                    raise HTTPException(
                        status_code=response.status,
                        detail={
                            "error": "Failed to create session",
                            "details": error_text,
                        },
                    )

                # Send back the SDP we received from the OpenAI REST API
                answer_sdp = await response.text()
                logger.info(f"Successfully created session for mode: {mode_id}")
                return Response(content=answer_sdp, media_type="application/sdp")

    except aiohttp.ClientError as e:
        logger.error(f"Network error during session creation: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to create session", "details": str(e)},
        )
    except Exception as e:
        logger.error(f"Unexpected error during session creation: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "details": "An unexpected error occurred",
            },
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=settings.port,
        log_level="info",
        reload=settings.debug,
    )
