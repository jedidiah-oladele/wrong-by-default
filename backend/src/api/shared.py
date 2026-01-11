"""
Shared instances for storage and usage tracking.
Initialized in main.py and used by routes.
"""

from typing import Optional
from src.storage.mongodb import MongoDBUsageStorage
from src.usage_tracker import UsageTracker

# These will be initialized in main.py
storage: Optional[MongoDBUsageStorage] = None
usage_tracker: Optional[UsageTracker] = None


def initialize_shared_instances(
    mongodb_url: str,
    mongodb_database: str,
    token_limit: int,
    reset_period_hours: int,
):
    """Initialize shared storage and usage tracker instances."""
    global storage, usage_tracker
    from src.usage_tracker import get_usage_tracker

    storage = MongoDBUsageStorage(
        mongodb_url=mongodb_url,
        database_name=mongodb_database,
    )
    usage_tracker = get_usage_tracker(
        storage=storage,
        token_limit=token_limit,
        reset_period_hours=reset_period_hours,
    )
