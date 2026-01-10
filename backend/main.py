"""
FastAPI server for OpenAI Realtime API integration.
Production-grade setup with logging, error handling, and structured configuration.
"""

import logging
import ssl
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import aiohttp
from dotenv import load_dotenv

# Try to use certifi for SSL certificates (better for macOS)
try:
    import certifi

    SSL_CERT_PATH = certifi.where()
except ImportError:
    SSL_CERT_PATH = None

from config import get_settings
from src.prompts import get_instructions_for_mode, get_voice_for_mode
from src.usage_tracker import get_usage_tracker
from src.storage.mongodb import MongoDBUsageStorage

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

# Initialize MongoDB storage and usage tracker
storage = MongoDBUsageStorage(
    mongodb_url=settings.mongodb_url,
    database_name=settings.mongodb_database,
)
usage_tracker = get_usage_tracker(
    storage=storage,
    token_limit=settings.token_limit_per_ip,
    reset_period_hours=settings.token_reset_period_hours,
)

# API Key authentication
security = HTTPBearer()


async def verify_api_key(
    authorization: HTTPAuthorizationCredentials = Depends(security),
) -> bool:
    """Verify API key from Authorization header."""
    if not settings.backend_api_key:
        # If no API key is configured, allow all requests (development mode)
        return True
    
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing API key. Please provide an Authorization header with Bearer token.",
        )
    
    provided_key = authorization.credentials
    if provided_key != settings.backend_api_key:
        raise HTTPException(
            status_code=403,
            detail="Invalid API key.",
        )
    
    return True


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    logger.info("Starting server...")
    logger.info(f"Server will run on port {settings.port}")
    logger.info(f"Frontend URL: {settings.frontend_url}")
    
    # Pre-connect to MongoDB at startup
    try:
        await storage._connect()
        logger.info("MongoDB connection established at startup")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB at startup: {e}", exc_info=True)
        raise
    
    yield
    # Shutdown
    logger.info("Shutting down server...")
    await usage_tracker.close()


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


def get_session_config(mode_id: str) -> str:
    """Get session configuration based on mode."""
    import json

    base_config = {
        "type": "realtime",
        "model": settings.openai_model,
        "audio": {
            "input": {
                "transcription": {
                    "model": "whisper-1",
                    "language": "en",
                },
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.8,
                    "prefix_padding_ms": 300,
                    "silence_duration_ms": 500,
                },
            },
            "output": {
                "voice": get_voice_for_mode(mode_id),
            }
        },
        "instructions": get_instructions_for_mode(mode_id),
    }
    return json.dumps(base_config)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "wrong-by-default-api"}


@app.post("/api/usage/report")
async def report_usage(
    request: Request,
    _: bool = Depends(verify_api_key),
):
    """
    Report token usage from a conversation checkpoint.
    Returns whether the session should be ended due to limit exceeded.
    """
    try:
        body = await request.json()
        tokens = body.get("tokens", 0)
        client_ip = request.client.host if request.client else "unknown"
        
        if tokens <= 0:
            raise HTTPException(status_code=400, detail="Tokens must be greater than 0")
        
        # Check limit before adding tokens
        allowed_before, usage_before = await usage_tracker.check_limit(client_ip)
        
        # Add tokens
        await usage_tracker.add_tokens(client_ip, tokens)
        
        # Check limit after adding tokens
        usage_after = await usage_tracker.get_usage(client_ip)
        limit_exceeded = usage_after["last_used_tokens"] >= usage_after["tokens_limit"]
        
        return {
            "success": True,
            "usage": usage_after,
            "limit_exceeded": limit_exceeded,
            "reset_at": usage_after["reset_at"].isoformat() if limit_exceeded else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reporting usage: {e}")
        raise HTTPException(status_code=500, detail="Failed to report usage")


@app.get("/api/usage")
async def get_usage(
    request: Request,
    _: bool = Depends(verify_api_key),
):
    """Get current usage for the requesting IP."""
    client_ip = request.client.host if request.client else "unknown"
    usage_info = usage_tracker.get_usage(client_ip)
    return usage_info


@app.post("/api/realtime/session")
async def create_session(
    request: Request,
    _: bool = Depends(verify_api_key),
):
    """Create a Realtime API session using the unified interface."""
    content_type = request.headers.get("content-type", "")
    client_ip = request.client.host if request.client else "unknown"

    # Check token usage limit
    allowed, usage_info = await usage_tracker.check_limit(client_ip)
    if not allowed:
        # Convert datetime to ISO string for JSON serialization
        usage_info_serializable = usage_info.copy()
        if isinstance(usage_info_serializable.get('reset_at'), datetime):
            usage_info_serializable['reset_at'] = usage_info_serializable['reset_at'].isoformat()
        
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Usage limit exceeded",
                "message": f"Usage limit reached. Resets in 24 hours.",
                "usage": usage_info_serializable
            }
        )

    logger.info(
        f"Session creation request from {client_ip} "
        f"(current: {usage_info['last_used_tokens']}/{usage_info['tokens_limit']}, "
        f"total: {usage_info['total_tokens']})"
    )

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

    try:
        # Create SSL context with certificates
        # Use certifi if available (better for macOS), otherwise use default
        if SSL_CERT_PATH:
            ssl_context = ssl.create_default_context(cafile=SSL_CERT_PATH)
        else:
            ssl_context = ssl.create_default_context()

        # Create connector with SSL context
        connector = aiohttp.TCPConnector(ssl=ssl_context)

        # OpenAI Realtime API expects multipart/form-data with sdp and session fields
        form_data = aiohttp.FormData(default_to_multipart=True)
        form_data.add_field("sdp", sdp)
        form_data.add_field("session", session_config)

        async with aiohttp.ClientSession(connector=connector) as session:
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
