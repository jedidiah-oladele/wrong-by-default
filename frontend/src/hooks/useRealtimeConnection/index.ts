/**
 * Main hook for managing OpenAI Realtime API WebRTC connection.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { TranscriptMessage } from "@/lib/mockTranscript";
import { createWebRTCConnection, establishConnection, cleanupWebRTC } from "./webrtc";
import { createEventHandlers } from "./eventHandlers";
import { formatResetTime } from "./usage";

interface RealtimeConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  messages: TranscriptMessage[];
}

interface UseRealtimeConnectionOptions {
  modeId: string;
  onMessage?: (message: TranscriptMessage) => void;
  onError?: (error: Error) => void;
  onUsageUpdate?: (usage: { last_used_tokens: number; total_tokens: number; tokens_limit: number; tokens_remaining: number; reset_at: string; limit_exceeded: boolean }) => void;
}

export const useRealtimeConnection = ({
  modeId,
  onMessage,
  onError,
  onUsageUpdate,
}: UseRealtimeConnectionOptions) => {
  const [state, setState] = useState<RealtimeConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    messages: [],
  });

  const connectionRef = useRef<Awaited<ReturnType<typeof createWebRTCConnection>> | null>(null);
  const currentAssistantMessageIdRef = useRef<string | null>(null);
  const pendingUserMessagesRef = useRef<Map<string, { itemId: string; timestamp: number }>>(new Map());
  const connectionTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const addMessage = useCallback(
    (message: TranscriptMessage) => {
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, message],
      }));
      onMessage?.(message);
    },
    [onMessage]
  );

  const disconnect = useCallback(() => {
    cleanupWebRTC(connectionRef.current);
    connectionRef.current = null;

    if (connectionTimeoutIdRef.current) {
      clearTimeout(connectionTimeoutIdRef.current);
      connectionTimeoutIdRef.current = null;
    }

    // Reset assistant message tracking
    currentAssistantMessageIdRef.current = null;
    pendingUserMessagesRef.current.clear();

    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }));
  }, []);

  const handleLimitExceeded = useCallback((resetAt: string) => {
    const resetTime = formatResetTime(resetAt);
    setState((prev) => ({
      ...prev,
      error: `Usage limit reached. Please try again ${resetTime}.`,
    }));
    disconnect();
  }, [disconnect]);

  const connect = useCallback(async () => {
    // Use refs to check current state to avoid stale closures
    if (connectionRef.current?.peerConnection.connectionState === "connected" || 
        connectionRef.current?.peerConnection.connectionState === "connecting") {
      return;
    }

    setState((prev) => {
      if (prev.isConnecting || prev.isConnected) {
        return prev; // Already connecting or connected
      }
      return { ...prev, isConnecting: true, error: null };
    });

    // Set up connection timeout (45 seconds total - 30s for fetch + 15s for WebRTC)
    connectionTimeoutIdRef.current = setTimeout(() => {
      if (connectionRef.current?.peerConnection.connectionState !== "connected") {
        console.error("Connection timeout - WebRTC did not establish in time");
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          isConnected: false,
          error: "Connection timeout - please try again",
        }));
        disconnect();
      }
    }, 45000); // 45 seconds total timeout

    try {
      // Create event handler
      const handleServerEvent = createEventHandlers({
        addMessage,
        setState,
        onMessage,
        onLimitExceeded: handleLimitExceeded,
        onUsageUpdate,
        currentAssistantMessageIdRef,
        pendingUserMessagesRef,
      });

      // Create WebRTC connection
      const connection = await createWebRTCConnection(
        (event) => {
          try {
            const data = JSON.parse(event.data);
            handleServerEvent(data);
          } catch (error) {
            console.error("Error parsing server event:", error);
          }
        },
        () => {
          console.log("Data channel opened");
        },
        (error) => {
          console.error("Data channel error:", error);
          onError?.(new Error("Data channel error"));
        },
        (connectionState) => {
          console.log("Connection state changed:", connectionState);
          
          if (connectionState === "connected") {
            // Clear timeout on successful connection
            if (connectionTimeoutIdRef.current) {
              clearTimeout(connectionTimeoutIdRef.current);
              connectionTimeoutIdRef.current = null;
            }
            setState((prev) => ({
              ...prev,
              isConnected: true,
              isConnecting: false,
              error: null,
            }));
          } else if (connectionState === "disconnected" || connectionState === "failed" || connectionState === "closed") {
            // Clear timeout on failure
            if (connectionTimeoutIdRef.current) {
              clearTimeout(connectionTimeoutIdRef.current);
              connectionTimeoutIdRef.current = null;
            }
            setState((prev) => ({
              ...prev,
              isConnected: false,
              isConnecting: false,
              error: connectionState === "failed" ? "Connection failed" : null,
            }));
          } else if (connectionState === "connecting") {
            setState((prev) => ({
              ...prev,
              isConnecting: true,
            }));
          }
        }
      );

      connectionRef.current = connection;

      // Establish connection with backend
      await establishConnection(connection.peerConnection, modeId);

      // Connection state will be updated via onconnectionstatechange handler
      // Don't set isConnected here - wait for the actual connection to establish
      // The timeout will handle cases where connection never establishes
    } catch (error) {
      // Clear timeout on error
      if (connectionTimeoutIdRef.current) {
        clearTimeout(connectionTimeoutIdRef.current);
        connectionTimeoutIdRef.current = null;
      }
      
      console.error("Connection error:", error);
      let errorMessage = "Failed to connect";
      
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Connection timeout - server took too long to respond";
        } else {
          errorMessage = error.message;
        }
      }
      
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        isConnected: false,
        error: errorMessage,
      }));
      
      cleanupWebRTC(connectionRef.current);
      connectionRef.current = null;
      
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [modeId, onError, addMessage, onMessage, handleLimitExceeded, onUsageUpdate, disconnect]);

  const sendEvent = useCallback(
    (event: Record<string, unknown>) => {
      if (connectionRef.current?.dataChannel && connectionRef.current.dataChannel.readyState === "open") {
        connectionRef.current.dataChannel.send(JSON.stringify(event));
      } else {
        console.warn("Data channel not open, cannot send event");
      }
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    sendEvent,
    mediaStream: connectionRef.current?.mediaStream || null,
    audioElement: connectionRef.current?.audioElement || null,
  };
};
