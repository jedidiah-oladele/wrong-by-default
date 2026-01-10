"""
MongoDB implementation of usage storage.
"""

from datetime import datetime
from typing import Optional, Dict, Any
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

# Try to use certifi for SSL certificates (better for macOS)
try:
    import certifi
    SSL_CERT_PATH = certifi.where()
except ImportError:
    SSL_CERT_PATH = None

from .base import UsageStorage

logger = logging.getLogger(__name__)


class MongoDBUsageStorage(UsageStorage):
    """MongoDB implementation of usage storage."""

    def __init__(self, mongodb_url: str, database_name: str, collection_name: str = "usage_tracking"):
        """
        Initialize MongoDB storage.

        Args:
            mongodb_url: MongoDB connection URL
            database_name: Name of the database
            collection_name: Name of the collection (default: "usage_tracking")
        """
        self.mongodb_url = mongodb_url
        self.database_name = database_name
        self.collection_name = collection_name
        self.client: Optional[AsyncIOMotorClient] = None
        self.db: Optional[AsyncIOMotorDatabase] = None

    async def _connect(self):
        """Connect to MongoDB if not already connected."""
        if self.client is None:
            try:
                # Configure SSL certificate verification using certifi
                client_kwargs = {}
                if SSL_CERT_PATH:
                    client_kwargs["tlsCAFile"] = SSL_CERT_PATH
                
                self.client = AsyncIOMotorClient(self.mongodb_url, **client_kwargs)
                if self.client is None:
                    raise RuntimeError("Failed to create MongoDB client")
                self.db = self.client[self.database_name]
                if self.db is None:
                    raise RuntimeError("Failed to get database")
                # Test connection
                await self.client.admin.command("ping")
                logger.info(f"Connected to MongoDB: {self.database_name}")
            except Exception as e:
                logger.error(f"Failed to connect to MongoDB: {e}", exc_info=True)
                raise

    async def _get_collection(self):
        """Get the usage tracking collection."""
        if self.db is None:
            await self._connect()
        if self.db is None:
            raise RuntimeError("Database connection not available")
        return self.db[self.collection_name]

    async def get_usage(self, client_id: str) -> Optional[Dict[str, Any]]:
        """Get usage data for a client."""
        collection = await self._get_collection()
        doc = await collection.find_one({"_id": client_id})
        
        if not doc:
            return None
        
        # Convert last_reset to datetime if it's a string
        last_reset = doc.get("last_reset")
        if isinstance(last_reset, str):
            last_reset = datetime.fromisoformat(last_reset)
        
        return {
            "last_used_tokens": doc.get("last_used_tokens", 0),
            "total_tokens": doc.get("total_tokens", 0),
            "last_reset": last_reset or datetime.now(),
        }

    async def set_usage(
        self, client_id: str, last_used_tokens: int, total_tokens: int, last_reset: datetime
    ) -> None:
        """Set usage data for a client."""
        collection = await self._get_collection()
        await collection.update_one(
            {"_id": client_id},
            {
                "$set": {
                    "last_used_tokens": last_used_tokens,
                    "total_tokens": total_tokens,
                    "last_reset": last_reset,
                }
            },
            upsert=True,
        )

    async def increment_tokens(self, client_id: str, tokens: int) -> None:
        """Increment token counts for a client (both last_used_tokens and total_tokens)."""
        collection = await self._get_collection()
        # Check if document exists
        doc = await collection.find_one({"_id": client_id})
        
        if doc is None:
            # Document doesn't exist - create it with initial values
            await collection.insert_one({
                "_id": client_id,
                "last_used_tokens": tokens,
                "total_tokens": tokens,
                "last_reset": datetime.now(),
            })
        else:
            # Document exists - increment both fields
            await collection.update_one(
                {"_id": client_id},
                {
                    "$inc": {
                        "last_used_tokens": tokens,
                        "total_tokens": tokens,
                    },
                },
            )

    async def reset_usage(self, client_id: str) -> None:
        """Reset usage for a client (only resets last_used_tokens, preserves total_tokens)."""
        collection = await self._get_collection()
        await collection.update_one(
            {"_id": client_id},
            {
                "$set": {
                    "last_used_tokens": 0,
                    "last_reset": datetime.now(),
                }
            },
            upsert=True,
        )

    async def close(self) -> None:
        """Close MongoDB connection."""
        if self.client:
            self.client.close()
            self.client = None
            self.db = None
            logger.info("Closed MongoDB connection")
