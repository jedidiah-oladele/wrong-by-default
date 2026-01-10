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

  const connect = useCallback(async () => {
    if (state.isConnecting || state.isConnected) {
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

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

      // Send SDP to server
      const response = await fetch("http://localhost:3000/api/realtime/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sdp: offer.sdp,
          modeId,
        }),
      });

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

      setState((prev) => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
      }));
    } catch (error) {
      console.error("Connection error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to connect";
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [modeId, state.isConnecting, state.isConnected, onError]);

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
      if (event.type === "conversation.item.input_audio_transcription.completed") {
        const transcription = (event as { transcription?: string }).transcription;
        if (transcription) {
          addMessage({
            id: `user-${Date.now()}`,
            role: "user",
            content: transcription,
          });
        }
      } else if (event.type === "response.audio_transcript.delta") {
        // Handle streaming transcript deltas
        const delta = (event as { delta?: string }).delta;
        if (delta) {
          // For now, we'll accumulate deltas - you might want to update the last message
          // This is a simplified version
          console.log("Transcript delta:", delta);
        }
      } else if (event.type === "response.audio_transcript.done") {
        const transcript = (event as { transcript?: string }).transcript;
        if (transcript) {
          addMessage({
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: transcript,
          });
        }
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

      // Log all events for debugging
      console.log("Server event:", event);
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
  };
};
