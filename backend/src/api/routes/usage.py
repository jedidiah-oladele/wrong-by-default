"""Usage tracking routes."""

from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, Depends
from src.api.models import UsageInfo, UsageReportRequest, UsageReportResponse
from src.api.dependencies import get_client_ip, verify_api_key
from src.api import shared

router = APIRouter()


@router.get("/api/usage", response_model=UsageInfo)
async def get_usage(
    request: Request,
    _: bool = Depends(verify_api_key),
) -> UsageInfo:
    """
    Get current token usage information for the requesting client.

    Retrieves the usage statistics for the client's IP address, including:
    - Tokens used in the current reset period (last_used_tokens)
    - Total tokens used across all time (total_tokens)
    - Token limit for the current period (tokens_limit)
    - Remaining tokens in the current period (tokens_remaining)
    - When the usage will reset (reset_at)
    - Whether the limit has been exceeded (limit_exceeded)

    The client IP is automatically extracted from request headers (X-Forwarded-For,X-Real-IP) or the direct connection IP.

    Args:
        request: FastAPI Request object used to extract client IP.
        _: API key verification dependency (automatically handled).

    Returns:
        UsageInfo: Current usage information for the client.

    Raises:
        HTTPException: 500 if usage tracker is not initialized.
        HTTPException: 401 if API key is missing or invalid.

    Example:
        ```json
        {
            "last_used_tokens": 5000,
            "total_tokens": 15000,
            "tokens_limit": 100000,
            "tokens_remaining": 95000,
            "reset_at": "2026-01-12T09:34:28.123456",
            "limit_exceeded": false
        }
        ```
    """
    if shared.usage_tracker is None:
        raise HTTPException(status_code=500, detail="Usage tracker not initialized")

    client_ip = get_client_ip(request)
    usage_data = await shared.usage_tracker.get_usage(client_ip)

    # Convert datetime to ISO string if needed
    reset_at_str = usage_data["reset_at"]
    if isinstance(reset_at_str, datetime):
        reset_at_str = reset_at_str.isoformat()

    # Calculate if limit is exceeded
    limit_exceeded = usage_data["last_used_tokens"] >= usage_data["tokens_limit"]

    return UsageInfo(
        last_used_tokens=usage_data["last_used_tokens"],
        total_tokens=usage_data["total_tokens"],
        tokens_limit=usage_data["tokens_limit"],
        tokens_remaining=usage_data["tokens_remaining"],
        reset_at=reset_at_str,
        limit_exceeded=limit_exceeded,
    )


@router.post("/api/usage/report", response_model=UsageReportResponse)
async def report_usage(
    request_body: UsageReportRequest,
    request: Request,
    _: bool = Depends(verify_api_key),
) -> UsageReportResponse:
    """
    Report token usage and update client usage tracking.

    Adds the specified number of tokens to the client's usage tracking and returns updated usage information including whether the limit has been exceeded. The tokens are added to both the current period usage (last_used_tokens) and the total lifetime usage (total_tokens).

    The client IP is automatically extracted from request headers. If the limit is exceeded after adding the tokens, the `limit_exceeded` flag will be set to true in the response, indicating that the session should be terminated.

    Args:
        request_body: Request containing the number of tokens to report.
            - tokens (int): Number of tokens consumed (must be > 0).
        request: FastAPI Request object used to extract client IP.
        _: API key verification dependency (automatically handled).

    Returns:
        UsageReportResponse: Response containing:
            - success (bool): Whether the operation succeeded.
            - usage (UsageInfo): Updated usage information after adding tokens.

    Raises:
        HTTPException: 400 if tokens is <= 0.
        HTTPException: 500 if usage tracker is not initialized or operation fails.
        HTTPException: 401 if API key is missing or invalid.

    Example Request:
        ```json
        {
            "tokens": 1234
        }
        ```

    Example Response:
        ```json
        {
            "success": true,
            "usage": {
                "last_used_tokens": 6234,
                "total_tokens": 16234,
                "tokens_limit": 100000,
                "tokens_remaining": 93766,
                "reset_at": "2026-01-12T09:34:28.123456",
                "limit_exceeded": false
            }
        }
        ```
    """
    if shared.usage_tracker is None:
        raise HTTPException(status_code=500, detail="Usage tracker not initialized")

    try:
        client_ip = get_client_ip(request)

        # Check limit before adding tokens
        allowed_before, usage_before = await shared.usage_tracker.check_limit(client_ip)

        # Add tokens
        await shared.usage_tracker.add_tokens(client_ip, request_body.tokens)

        # Check limit after adding tokens
        usage_after = await shared.usage_tracker.get_usage(client_ip)
        limit_exceeded = usage_after["last_used_tokens"] >= usage_after["tokens_limit"]

        # Convert datetime to ISO string if needed
        reset_at_str = usage_after["reset_at"]
        if isinstance(reset_at_str, datetime):
            reset_at_str = reset_at_str.isoformat()

        usage_info = UsageInfo(
            last_used_tokens=usage_after["last_used_tokens"],
            total_tokens=usage_after["total_tokens"],
            tokens_limit=usage_after["tokens_limit"],
            tokens_remaining=usage_after["tokens_remaining"],
            reset_at=reset_at_str,
            limit_exceeded=limit_exceeded,
        )

        return UsageReportResponse(
            success=True,
            usage=usage_info,
        )
    except HTTPException:
        raise
    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Error reporting usage: {e}")
        raise HTTPException(status_code=500, detail="Failed to report usage")
