"""
Shared dependencies and utilities for API routes.
"""

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import get_settings

settings = get_settings()
security = HTTPBearer()


def get_client_ip(request: Request) -> str:
    """
    Get the real client IP address from request.
    Checks X-Forwarded-For header first (for Cloud Run/proxies), then falls back to request.client.host.
    """
    # Check X-Forwarded-For header (most common in Cloud Run/proxies)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, take the first one (original client)
        client_ip = forwarded_for.split(",")[0].strip()
        if client_ip:
            return client_ip

    # Check X-Real-IP header (alternative)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    # Fallback to direct client IP
    if request.client:
        return request.client.host

    return "unknown"


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
