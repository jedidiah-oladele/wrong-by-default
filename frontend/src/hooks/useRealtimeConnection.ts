import { useEffect, useRef, useState, useCallback } from "react";
import { TranscriptMessage } from "@/lib/mockTranscript";

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
}

export const useRealtimeConnection = ({
  modeId,
  onMessage,
  onError,
}: UseRealtimeConnectionOptions) => {
  const [state, setState] = useState<RealtimeConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    messages: [],
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const currentAssistantMessageIdRef = useRef<string | null>(null);
  const pendingUserMessagesRef = useRef<Map<string, { itemId: string; timestamp: number }>>(new Map());

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

  const updateMessage = useCallback(
    (messageId: string, content: string) => {
      setState((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg.id === messageId ? { ...msg, content } : msg
        ),
      }));
    },
    []
  );

  const connect = useCallback(async () => {
    // Use refs to check current state to avoid stale closures
    if (peerConnectionRef.current?.connectionState === "connected" || 
        peerConnectionRef.current?.connectionState === "connecting") {
      return;
    }

    setState((prev) => {
      if (prev.isConnecting || prev.isConnected) {
        return prev; // Already connecting or connected
      }
      return { ...prev, isConnecting: true, error: null };
    });

    // Set up connection timeout (45 seconds total - 30s for fetch + 15s for WebRTC)
    const connectionTimeoutId = setTimeout(() => {
      if (peerConnectionRef.current?.connectionState !== "connected") {
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
      // Create audio element for remote audio
      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement("audio");
        audioElementRef.current.autoplay = true;
        audioElementRef.current.style.display = "none";
        document.body.appendChild(audioElementRef.current);
      }

      // Get user media (microphone)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = mediaStream;

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerConnectionRef.current = pc;

      // Monitor connection state changes
      pc.onconnectionstatechange = () => {
        const connectionState = pc.connectionState;
        console.log("Connection state changed:", connectionState);
        
        if (connectionState === "connected") {
          // Clear timeout on successful connection
          clearTimeout(connectionTimeoutId);
          setState((prev) => ({
            ...prev,
            isConnected: true,
            isConnecting: false,
            error: null,
          }));
        } else if (connectionState === "disconnected" || connectionState === "failed" || connectionState === "closed") {
          // Clear timeout on failure
          clearTimeout(connectionTimeoutId);
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
      };

      // Set up remote audio track
      pc.ontrack = (e) => {
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = e.streams[0];
        }
      };

      // Add local audio track
      mediaStream.getTracks().forEach((track) => {
        pc.addTrack(track, mediaStream);
      });

      // Create data channel for events
      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;

      // Handle data channel messages
      dc.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleServerEvent(data);
        } catch (error) {
          console.error("Error parsing server event:", error);
        }
      };

      dc.onopen = () => {
        console.log("Data channel opened");
      };

      dc.onerror = (error) => {
        console.error("Data channel error:", error);
        onError?.(new Error("Data channel error"));
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send SDP to server with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch("http://localhost:3000/api/realtime/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sdp: offer.sdp,
          modeId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to create session");
      }

      const answerSdp = await response.text();
      const answer = {
        type: "answer" as RTCSdpType,
        sdp: answerSdp,
      };

      await pc.setRemoteDescription(answer);

      // Connection state will be updated via onconnectionstatechange handler
      // Don't set isConnected here - wait for the actual connection to establish
      // The timeout will handle cases where connection never establishes
    } catch (error) {
      // Clear timeout on error
      clearTimeout(connectionTimeoutId);
      
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
      // Clean up on error
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [modeId, onError]);

  const disconnect = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
      audioElementRef.current.remove();
      audioElementRef.current = null;
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

  const sendEvent = useCallback(
    (event: Record<string, unknown>) => {
      if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
        dataChannelRef.current.send(JSON.stringify(event));
      } else {
        console.warn("Data channel not open, cannot send event");
      }
    },
    []
  );

  const handleServerEvent = useCallback(
    (event: Record<string, unknown>) => {
      // Handle different event types from OpenAI Realtime API
      // Track user items when they're created to maintain proper order
      if (event.type === "conversation.item.added") {
        const item = (event as { item?: { id?: string; role?: string } }).item;
        if (item?.role === "user" && item.id) {
          // Track this user item so we can insert the transcript in the right place later
          // Store the timestamp when the item was added
          pendingUserMessagesRef.current.set(item.id, {
            itemId: item.id,
            timestamp: Date.now(),
          });
        }
      } else if (event.type === "conversation.item.input_audio_transcription.completed") {
        const transcriptEvent = event as { transcript?: string; item_id?: string };
        const transcript = transcriptEvent.transcript;
        const itemId = transcriptEvent.item_id;
        
        if (transcript && itemId) {
          // Check if we have a pending message for this item
          const pending = pendingUserMessagesRef.current.get(itemId);
          const messageTimestamp = pending?.timestamp || Date.now();
          
          // Insert the user message at the correct position
          setState((prev) => {
            // Find where to insert: before any assistant messages created after this user item
            let insertIndex = prev.messages.length;
            
            // Find the first assistant message that was created after this user item
            for (let i = 0; i < prev.messages.length; i++) {
              const msg = prev.messages[i];
              if (msg.role === "assistant") {
                // Extract timestamp from message ID (format: "assistant-{timestamp}")
                const msgTimestamp = parseInt(msg.id.split("-")[1] || "0");
                if (msgTimestamp > messageTimestamp) {
                  insertIndex = i;
                  break;
                }
              }
            }
            
            // Create the new message
            const newMessage: TranscriptMessage = {
              id: `user-${messageTimestamp}`,
              role: "user",
              content: transcript,
            };
            
            // Insert at the correct position
            const newMessages = [
              ...prev.messages.slice(0, insertIndex),
              newMessage,
              ...prev.messages.slice(insertIndex),
            ];
            
            // Remove from pending
            pendingUserMessagesRef.current.delete(itemId);
            
            return {
              ...prev,
              messages: newMessages,
            };
          });
          
          // Also call onMessage callback
          onMessage?.({
            id: `user-${messageTimestamp}`,
            role: "user",
            content: transcript,
          });
        }
      } else if (event.type === "conversation.item.input_audio_transcription.delta") {
        // Handle streaming user transcription deltas (optional - we can accumulate or wait for completed)
        // Note: We're waiting for the completed event to add the message
        // But we could accumulate deltas here similar to AI transcripts if needed
      } else if (event.type === "response.output_audio_transcript.delta") {
        // Handle streaming transcript deltas - accumulate them in real-time
        const delta = (event as { delta?: string }).delta;
        if (delta) {
          // Create or update the current assistant message
          if (!currentAssistantMessageIdRef.current) {
            // Create a new assistant message
            const messageId = `assistant-${Date.now()}`;
            currentAssistantMessageIdRef.current = messageId;
            addMessage({
              id: messageId,
              role: "assistant",
              content: delta,
            });
          } else {
            // Update existing message by appending delta
            setState((prev) => {
              const currentMessage = prev.messages.find(
                (msg) => msg.id === currentAssistantMessageIdRef.current
              );
              if (currentMessage) {
                return {
                  ...prev,
                  messages: prev.messages.map((msg) =>
                    msg.id === currentAssistantMessageIdRef.current
                      ? { ...msg, content: msg.content + delta }
                      : msg
                  ),
                };
              }
              return prev;
            });
          }
        }
      } else if (event.type === "response.output_audio_transcript.done") {
        // Final transcript - update the current message or create new one
        const transcript = (event as { transcript?: string }).transcript;
        if (transcript) {
          if (currentAssistantMessageIdRef.current) {
            // Update the existing streaming message with final transcript
            setState((prev) => ({
              ...prev,
              messages: prev.messages.map((msg) =>
                msg.id === currentAssistantMessageIdRef.current
                  ? { ...msg, content: transcript }
                  : msg
              ),
            }));
            currentAssistantMessageIdRef.current = null;
          } else {
            // Create new message if no streaming message exists
            addMessage({
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: transcript,
            });
          }
        }
      } else if (event.type === "response.done") {
        // Response is complete, reset the current assistant message ID
        // Don't create a new message here - we already have one from the deltas
        // Just make sure the existing message is updated with the final transcript if needed
        // The response.done event might have a more complete transcript, but we've already
        // been accumulating deltas, so we should be good.
        
        // Only update if we have a current message and the response has a different/complete transcript
        const response = event as { 
          response?: { 
            output?: Array<{ 
              type?: string; 
              role?: string;
              content?: Array<{ 
                type?: string; 
                transcript?: string;
                text?: string;
              }> 
            }> 
          } 
        };
        
        if (currentAssistantMessageIdRef.current && response.response?.output) {
          for (const output of response.response.output) {
            if (output.type === "message" && output.role === "assistant" && output.content) {
              for (const content of output.content) {
                if (content.type === "output_audio" && content.transcript) {
                  // Update the existing message with the final transcript (might be more complete)
                  setState((prev) => ({
                    ...prev,
                    messages: prev.messages.map((msg) =>
                      msg.id === currentAssistantMessageIdRef.current
                        ? { ...msg, content: content.transcript || msg.content }
                        : msg
                    ),
                  }));
                  break;
                }
              }
            }
          }
        }
        
        currentAssistantMessageIdRef.current = null;
      } else if (event.type === "conversation.item.created") {
        const item = (event as { item?: { role?: string; content?: Array<{ text?: string }> } })
          .item;
        if (item?.role === "assistant" && item.content?.[0]?.text) {
          addMessage({
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: item.content[0].text,
          });
        }
      }

    },
    [addMessage]
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
    mediaStream: mediaStreamRef.current,
    audioElement: audioElementRef.current,
  };
};
