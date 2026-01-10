"""
Configuration management for the server.
Uses Pydantic settings for type-safe configuration.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Server configuration
    port: int = 3000
    frontend_url: str = "http://localhost:8080"
    debug: bool = False

    # API authentication
    backend_api_key: Optional[str] = None

    # Usage limits
    token_limit_per_ip: int = 100000  # Tokens per IP per reset period
    token_reset_period_hours: int = 24  # Hours before usage resets

    # MongoDB configuration
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_database: str = "wrong_by_default"

    # OpenAI configuration
    openai_api_key: Optional[str] = None
    openai_api_base: str = "https://api.openai.com"
    openai_model: str = "gpt-realtime"
    openai_voice: str = "marin"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # Ignore extra environment variables


_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get or create settings singleton."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
