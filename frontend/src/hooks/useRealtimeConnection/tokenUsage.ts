/**
 * Token usage reporting and limit checking.
 */

import { config } from "@/config";

interface TokenUsageResponse {
  success: boolean;
  usage: {
    tokens_used: number;
    tokens_limit: number;
    tokens_remaining: number;
    reset_at: string;
  };
  limit_exceeded: boolean;
  reset_at?: string;
}

/**
 * Report token usage to backend and check if limit is exceeded.
 * Returns whether the session should be ended.
 */
export async function reportTokenUsage(
  tokens: number,
  onLimitExceeded: () => void
): Promise<void> {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (config.backendApiKey) {
      headers["Authorization"] = `Bearer ${config.backendApiKey}`;
    }

    const response = await fetch(`${config.apiBaseUrl}/api/usage/report`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tokens }),
    });

    if (response.ok) {
      const data: TokenUsageResponse = await response.json();
      
      // If limit exceeded, trigger disconnect
      if (data.limit_exceeded) {
        onLimitExceeded();
      }
    }
  } catch (error) {
    // Silently fail - don't interrupt the conversation if reporting fails
    console.error("Failed to report token usage:", error);
  }
}
