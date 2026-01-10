/**
 * Frontend configuration loaded from environment variables.
 */

export const config = {
  apiBaseUrl: import.meta.env.VITE_BACKEND_API_BASE_URL || "http://localhost:3000",
  backendApiKey: import.meta.env.VITE_BACKEND_API_KEY,
} as const;
