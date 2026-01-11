/**
 * Usage information fetching, reporting, and limit checking.
 */

import { config } from "@/config";

export interface UsageInfo {
  last_used_tokens: number;
  total_tokens: number;
  tokens_limit: number;
  tokens_remaining: number;
  reset_at: string; // ISO datetime string
  limit_exceeded: boolean;
}

interface TokenUsageResponse {
  success: boolean;
  usage: UsageInfo;
}

/**
 * Create headers with authentication if configured.
 */
function createHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (config.backendApiKey) {
    headers["Authorization"] = `Bearer ${config.backendApiKey}`;
  }
  
  return headers;
}

// Cache for usage data (5 minutes)
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
let cachedUsage: UsageInfo | null = null;
let cacheTimestamp: number = 0;

/**
 * Fetch current usage information from the backend.
 * Uses a 5-minute cache to avoid excessive API calls.
 * 
 * @param forceRefresh - If true, bypasses cache and fetches fresh data
 */
export async function fetchUsage(forceRefresh: boolean = false): Promise<UsageInfo | null> {
  const now = Date.now();
  
  // Return cached data if it's still valid and not forcing refresh
  if (!forceRefresh && cachedUsage && (now - cacheTimestamp) < CACHE_DURATION_MS) {
    return cachedUsage;
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/usage`, {
      method: "GET",
      headers: createHeaders(),
    });

    if (response.ok) {
      const data: UsageInfo = await response.json();
      
      // Update cache
      cachedUsage = data;
      cacheTimestamp = now;
      
      return data;
    }
    
    return null;
  } catch (error) {
    console.error("Failed to fetch usage:", error);
    return null;
  }
}

/**
 * Report token usage to backend and check if limit is exceeded.
 * Returns the updated usage data if successful.
 */
export async function reportTokenUsage(
  tokens: number,
  onLimitExceeded: (resetAt: string) => void
): Promise<UsageInfo | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/usage/report`, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({ tokens }),
    });

    if (response.ok) {
      const data: TokenUsageResponse = await response.json();
      
      // If limit exceeded, trigger disconnect with reset time
      if (data.usage.limit_exceeded) {
        onLimitExceeded(data.usage.reset_at);
      }
      
      // Update cache with fresh data
      cachedUsage = data.usage;
      cacheTimestamp = Date.now();
      
      return data.usage;
    }
    
    return null;
  } catch (error) {
    // Silently fail - don't interrupt the conversation if reporting fails
    console.error("Failed to report token usage:", error);
    return null;
  }
}

/**
 * Format reset time for display.
 * Returns a human-readable string like "in 2 hours" or "in 30 minutes".
 */
export function formatResetTime(resetAt: string): string {
  try {
    const resetDate = new Date(resetAt);
    const now = new Date();
    const diffMs = resetDate.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return "now";
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `in ${hours} hour${hours > 1 ? "s" : ""}${minutes > 0 ? ` and ${minutes} minute${minutes > 1 ? "s" : ""}` : ""}`;
    } else if (minutes > 0) {
      return `in ${minutes} minute${minutes > 1 ? "s" : ""}`;
    } else {
      return "in less than a minute";
    }
  } catch (error) {
    console.error("Error formatting reset time:", error);
    return "in 24 hours";
  }
}
