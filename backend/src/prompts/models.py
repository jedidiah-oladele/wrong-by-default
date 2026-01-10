"""
Data models for prompt configurations.
"""

from typing import TypedDict


class ModeConfig(TypedDict):
    """Configuration for a thinking mode."""
    voice: str
    prompt: str
