"""
Base storage interface for usage tracking data.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from abc import ABC, abstractmethod


class UsageStorage(ABC):
    """Abstract base class for storage implementations."""

    @abstractmethod
    async def get_usage(self, client_id: str) -> Optional[Dict[str, Any]]:
        """
        Get usage data for a client.

        Args:
            client_id: Client identifier (IP address)

        Returns:
            Usage data dict with 'tokens' and 'last_reset', or None if not found
        """
        pass

    @abstractmethod
    async def set_usage(
        self, client_id: str, tokens: int, last_reset: datetime
    ) -> None:
        """
        Set usage data for a client.

        Args:
            client_id: Client identifier (IP address)
            tokens: Number of tokens used
            last_reset: Timestamp of last reset
        """
        pass

    @abstractmethod
    async def increment_tokens(self, client_id: str, tokens: int) -> None:
        """
        Increment token count for a client.

        Args:
            client_id: Client identifier (IP address)
            tokens: Number of tokens to add
        """
        pass

    @abstractmethod
    async def reset_usage(self, client_id: str) -> None:
        """
        Reset usage for a client.

        Args:
            client_id: Client identifier (IP address)
        """
        pass

    @abstractmethod
    async def close(self) -> None:
        """Close storage connection."""
        pass
