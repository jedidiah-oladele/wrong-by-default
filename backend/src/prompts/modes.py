"""
Mode-specific system prompts for the AI assistant.
Each mode has a distinct personality and approach to challenging user thinking.
"""

from .content.devils_advocate import MODE_CONFIG as DEVILS_ADVOCATE_CONFIG
from .content.first_principles import MODE_CONFIG as FIRST_PRINCIPLES_CONFIG
from .content.edge_case import MODE_CONFIG as EDGE_CASE_CONFIG
from .content.second_order import MODE_CONFIG as SECOND_ORDER_CONFIG
from .models import ModeConfig

# Mode ID to configuration mapping
_MODE_CONFIGS: dict[str, ModeConfig] = {
    "devils-advocate": DEVILS_ADVOCATE_CONFIG,
    "first-principles": FIRST_PRINCIPLES_CONFIG,
    "edge-case": EDGE_CASE_CONFIG,
    "second-order": SECOND_ORDER_CONFIG,
}

# Default mode fallback
_DEFAULT_MODE = "devils-advocate"


def get_mode_config(mode_id: str) -> ModeConfig:
    """
    Get full configuration for a specific thinking mode.

    Args:
        mode_id: The identifier for the thinking mode

    Returns:
        Mode configuration dictionary with voice and prompt, or default to devils-advocate
    """
    return _MODE_CONFIGS.get(mode_id, _MODE_CONFIGS[_DEFAULT_MODE])


def get_instructions_for_mode(mode_id: str) -> str:
    """
    Get system instructions for a specific thinking mode.

    Args:
        mode_id: The identifier for the thinking mode

    Returns:
        System instructions string for the specified mode, or default to devils-advocate
    """
    return get_mode_config(mode_id)["prompt"]


def get_voice_for_mode(mode_id: str) -> str:
    """
    Get voice for a specific thinking mode.

    Args:
        mode_id: The identifier for the thinking mode

    Returns:
        Voice name for the specified mode, or default to devils-advocate voice
    """
    return get_mode_config(mode_id)["voice"]


def get_available_modes() -> list[str]:
    """
    Get list of available mode IDs.

    Returns:
        List of available mode identifiers
    """
    return list(_MODE_CONFIGS.keys())
