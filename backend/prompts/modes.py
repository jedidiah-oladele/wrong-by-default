"""
Mode-specific system prompts for the AI assistant.
Each mode has a distinct personality and approach to challenging user thinking.
"""

from typing import Dict

from .devils_advocate import PROMPT as DEVILS_ADVOCATE_PROMPT
from .first_principles import PROMPT as FIRST_PRINCIPLES_PROMPT
from .edge_case import PROMPT as EDGE_CASE_PROMPT
from .second_order import PROMPT as SECOND_ORDER_PROMPT

# Mode ID to prompt mapping
_MODE_PROMPTS: Dict[str, str] = {
    "devils-advocate": DEVILS_ADVOCATE_PROMPT,
    "first-principles": FIRST_PRINCIPLES_PROMPT,
    "edge-case": EDGE_CASE_PROMPT,
    "second-order": SECOND_ORDER_PROMPT,
}

# Default mode fallback
_DEFAULT_MODE = "devils-advocate"


def get_instructions_for_mode(mode_id: str) -> str:
    """
    Get system instructions for a specific thinking mode.

    Args:
        mode_id: The identifier for the thinking mode

    Returns:
        System instructions string for the specified mode, or default to devils-advocate
    """
    return _MODE_PROMPTS.get(mode_id, _MODE_PROMPTS[_DEFAULT_MODE])


def get_available_modes() -> list[str]:
    """
    Get list of available mode IDs.

    Returns:
        List of available mode identifiers
    """
    return list(_MODE_PROMPTS.keys())
