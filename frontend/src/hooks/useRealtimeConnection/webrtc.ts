/**
 * WebRTC connection management.
 */

import { config } from "@/config";

interface WebRTCConnection {
  peerConnection: RTCPeerConnection;
  dataChannel: RTCDataChannel;
  mediaStream: MediaStream;
  audioElement: HTMLAudioElement;
}

/**
 * Create and configure WebRTC peer connection.
 */
export async function createWebRTCConnection(
  onDataChannelMessage: (event: MessageEvent) => void,
  onDataChannelOpen: () => void,
  onDataChannelError: (error: Event) => void,
  onConnectionStateChange: (state: RTCPeerConnectionState) => void
): Promise<WebRTCConnection> {
  // Create audio element for remote audio
  const audioElement = document.createElement("audio");
  audioElement.autoplay = true;
  audioElement.style.display = "none";
  document.body.appendChild(audioElement);

  // Get user media (microphone)
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  // Create peer connection
  const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  // Monitor connection state changes
  peerConnection.onconnectionstatechange = () => {
    onConnectionStateChange(peerConnection.connectionState);
  };

  // Set up remote audio track
  peerConnection.ontrack = (e) => {
    audioElement.srcObject = e.streams[0];
  };

  // Add local audio track
  mediaStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, mediaStream);
  });

  // Create data channel for events
  const dataChannel = peerConnection.createDataChannel("oai-events");
  dataChannel.onmessage = onDataChannelMessage;
  dataChannel.onopen = onDataChannelOpen;
  dataChannel.onerror = onDataChannelError;

  return {
    peerConnection,
    dataChannel,
    mediaStream,
    audioElement,
  };
}

/**
 * Create SDP offer and exchange with backend to establish connection.
 */
export async function establishConnection(
  peerConnection: RTCPeerConnection,
  modeId: string
): Promise<void> {
  // Create offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // Send SDP to server with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  // Add Authorization header if API key is configured
  if (config.backendApiKey) {
    headers["Authorization"] = `Bearer ${config.backendApiKey}`;
  }

  const response = await fetch(`${config.apiBaseUrl}/api/realtime/session`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      sdp: offer.sdp,
      modeId,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
    
    // Handle 429 (Too Many Requests) - usage limit exceeded
    if (response.status === 429) {
      const detail = errorData.detail;
      if (typeof detail === "object" && detail.message) {
        throw new Error(detail.message);
      } else if (typeof detail === "string") {
        throw new Error(detail);
      } else {
        throw new Error("Usage limit reached. Resets in 24 hours.");
      }
    }
    
    // Handle other errors
    const errorMessage = 
      (typeof errorData.detail === "object" && errorData.detail?.message) ||
      (typeof errorData.detail === "string" && errorData.detail) ||
      errorData.error ||
      "Failed to create session";
    throw new Error(errorMessage);
  }

  const answerSdp = await response.text();
  const answer = {
    type: "answer" as RTCSdpType,
    sdp: answerSdp,
  };

  await peerConnection.setRemoteDescription(answer);
}

/**
 * Clean up WebRTC resources.
 */
export function cleanupWebRTC(connection: WebRTCConnection | null): void {
  if (!connection) return;

  if (connection.dataChannel) {
    connection.dataChannel.close();
  }

  if (connection.peerConnection) {
    connection.peerConnection.close();
  }

  if (connection.mediaStream) {
    connection.mediaStream.getTracks().forEach((track) => track.stop());
  }

  if (connection.audioElement) {
    connection.audioElement.srcObject = null;
    connection.audioElement.remove();
  }
}
