"""
Token usage tracking and rate limiting per IP address.
"""

from datetime import datetime, timedelta
from typing import Optional
import logging
from .storage.base import UsageStorage

logger = logging.getLogger(__name__)


class UsageTracker:
    """Tracks token usage per IP address with configurable limits."""

    def __init__(
        self,
        storage: UsageStorage,
        token_limit: int = 100000,
        reset_period_hours: int = 24,
    ):
        """
        Initialize usage tracker.

        Args:
            storage: Storage implementation for persisting usage data
            token_limit: Maximum tokens allowed per IP per reset period
            reset_period_hours: Hours after which usage resets (default: 24)
        """
        self.storage = storage
        self.token_limit = token_limit
        self.reset_period = timedelta(hours=reset_period_hours)

    def _get_client_id(self, ip_address: str) -> str:
        """Get client identifier from IP address."""
        return ip_address

    async def _should_reset(self, client_id: str) -> bool:
        """Check if usage should be reset for this client."""
        usage_data = await self.storage.get_usage(client_id)
        
        if not usage_data:
            return False
        
        last_reset = usage_data.get("last_reset")
        if not last_reset:
            return True
        
        if isinstance(last_reset, str):
            last_reset = datetime.fromisoformat(last_reset)
        elif not isinstance(last_reset, datetime):
            return True
        
        time_since_reset = datetime.now() - last_reset
        return time_since_reset >= self.reset_period

    async def _reset_usage(self, client_id: str):
        """Reset usage for a client."""
        await self.storage.reset_usage(client_id)
        logger.info(f"Reset usage for client {client_id}")

    async def get_usage(self, ip_address: str) -> dict:
        """Get current usage for an IP address."""
        client_id = self._get_client_id(ip_address)
        
        if await self._should_reset(client_id):
            await self._reset_usage(client_id)
        
        usage_data = await self.storage.get_usage(client_id)
        
        if not usage_data:
            # Initialize with default values
            tokens_used = 0
            last_reset = datetime.now()
            await self.storage.set_usage(client_id, 0, last_reset)
        else:
            tokens_used = usage_data.get("tokens", 0)
            last_reset = usage_data.get("last_reset", datetime.now())
            if isinstance(last_reset, str):
                last_reset = datetime.fromisoformat(last_reset)
        
        return {
            "tokens_used": tokens_used,
            "tokens_limit": self.token_limit,
            "tokens_remaining": max(0, self.token_limit - tokens_used),
            "reset_at": last_reset + self.reset_period
        }

    async def check_limit(self, ip_address: str) -> tuple[bool, dict]:
        """
        Check if IP address has exceeded token limit.

        Returns:
            (allowed, usage_info)
        """
        usage_info = await self.get_usage(ip_address)
        client_id = self._get_client_id(ip_address)
        
        usage_data = await self.storage.get_usage(client_id)
        tokens_used = usage_data.get("tokens", 0) if usage_data else 0
        
        allowed = tokens_used < self.token_limit
        
        if not allowed:
            logger.warning(
                f"Token limit exceeded for {ip_address}: "
                f"{tokens_used}/{self.token_limit} tokens used"
            )
        
        return allowed, usage_info

    async def add_tokens(self, ip_address: str, tokens: int):
        """
        Add tokens to usage tracking for an IP address.

        Args:
            ip_address: Client IP address
            tokens: Number of tokens to add (input + output)
        """
        client_id = self._get_client_id(ip_address)
        
        if await self._should_reset(client_id):
            await self._reset_usage(client_id)
        
        await self.storage.increment_tokens(client_id, tokens)
        
        usage_data = await self.storage.get_usage(client_id)
        tokens_used = usage_data.get("tokens", 0) if usage_data else 0
        
        logger.info(
            f"Added {tokens} tokens for {ip_address}. "
            f"Total: {tokens_used}/{self.token_limit}"
        )

    async def reset_all(self):
        """Reset all usage (useful for testing or manual resets)."""
        # Note: This would require storage to support clearing all data
        # For now, we'll log a warning
        logger.warning("reset_all() not implemented - requires storage support")

    async def close(self):
        """Close storage connection."""
        await self.storage.close()


# Global usage tracker instance
_usage_tracker: Optional[UsageTracker] = None


def get_usage_tracker(
    storage: UsageStorage,
    token_limit: int = 100000,
    reset_period_hours: int = 24,
) -> UsageTracker:
    """Get or create global usage tracker instance."""
    global _usage_tracker
    if _usage_tracker is None:
        _usage_tracker = UsageTracker(
            storage=storage,
            token_limit=token_limit,
            reset_period_hours=reset_period_hours,
        )
    return _usage_tracker
