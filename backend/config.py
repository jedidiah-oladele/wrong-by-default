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

    # OpenAI configuration
    openai_api_key: Optional[str] = None
    openai_api_base: str = "https://api.openai.com"
    openai_model: str = "gpt-4o-realtime-preview-2024-12-17"
    openai_voice: str = "marin"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get or create settings singleton."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
