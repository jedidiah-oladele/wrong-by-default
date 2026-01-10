"""
Storage abstraction for usage tracking data.
"""

from .base import UsageStorage
from .mongodb import MongoDBUsageStorage

__all__ = ["UsageStorage", "MongoDBUsageStorage"]
