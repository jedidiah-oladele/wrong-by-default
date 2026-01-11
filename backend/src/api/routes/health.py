"""Health check routes."""

from fastapi import APIRouter
from src.api.models import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.

    Returns the current health status of the API server.

    Returns:
        HealthResponse: Response containing the service status and name.

    Example:
        ```json
        {
            "status": "healthy",
            "service": "wrong-by-default-api"
        }
        ```
    """
    return HealthResponse(status="healthy", service="wrong-by-default-api")
