"""
Pydantic models for API request and response validation.
"""

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = Field(..., description="Service status")
    service: str = Field(..., description="Service name")


class UsageInfo(BaseModel):
    """Usage information for a client."""

    last_used_tokens: int = Field(
        ..., description="Tokens used in the current reset period"
    )
    total_tokens: int = Field(..., description="Total tokens used across all time")
    tokens_limit: int = Field(
        ..., description="Maximum tokens allowed per reset period"
    )
    tokens_remaining: int = Field(
        ..., description="Tokens remaining in the current period"
    )
    reset_at: str = Field(..., description="ISO datetime string when usage will reset")
    limit_exceeded: bool = Field(
        ..., description="Whether the usage limit has been exceeded"
    )


class UsageReportRequest(BaseModel):
    """Request model for reporting token usage."""

    tokens: int = Field(..., gt=0, description="Number of tokens to report")


class UsageReportResponse(BaseModel):
    """Response model for token usage reporting."""

    success: bool = Field(..., description="Whether the operation was successful")
    usage: UsageInfo = Field(..., description="Updated usage information")


class UsageLimitErrorDetail(BaseModel):
    """Error detail model for usage limit exceeded."""

    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Human-readable error message")
    usage: UsageInfo = Field(..., description="Current usage information")


class SessionCreateRequest(BaseModel):
    """Request model for creating a Realtime API session."""

    sdp: str = Field(..., description="SDP offer string from WebRTC")
    modeId: str = Field(
        default="devils-advocate", description="Thinking mode identifier"
    )
