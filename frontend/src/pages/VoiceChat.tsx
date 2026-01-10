import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ModeBadge from "@/components/ModeBadge";
import SessionTimer from "@/components/SessionTimer";
import Waveform from "@/components/Waveform";
import PushToTalk from "@/components/PushToTalk";
import Transcript from "@/components/Transcript";
import { getModeById, modes } from "@/lib/modes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";

const VoiceChat = () => {
  const { modeId } = useParams<{ modeId: string }>();
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionStart] = useState(new Date());
  const [switchModeOpen, setSwitchModeOpen] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const mode = getModeById(modeId || "");

  const {
    isConnected,
    isConnecting,
    error,
    messages,
    connect,
    disconnect,
    sendEvent,
    mediaStream,
  } = useRealtimeConnection({
    modeId: modeId || "",
    onMessage: (message) => {
      // Update speaking state when assistant responds
      if (message.role === "assistant") {
        setIsSpeaking(true);
        // Stop speaking after a delay (audio will play automatically)
        setTimeout(() => setIsSpeaking(false), 3000);
      }
    },
    onError: (err) => {
      console.error("Realtime connection error:", err);
    },
  });

  // Store media stream reference
  useEffect(() => {
    if (mediaStream) {
      mediaStreamRef.current = mediaStream;
    }
  }, [mediaStream]);

  // Connect when component mounts or mode changes
  useEffect(() => {
    if (mode && !isConnected && !isConnecting) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [mode?.id, connect, disconnect, isConnected, isConnecting]);

  // Handle push-to-talk: enable/disable microphone input
  useEffect(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isListening;
      });
    }
  }, [isListening]);

  // Detect when user stops speaking and send the audio
  const handleToggleListening = () => {
    if (isListening) {
      // User stopped speaking - commit the audio buffer and request response
      if (isConnected) {
        sendEvent({
          type: "input_audio_buffer.commit",
        });
        sendEvent({
          type: "response.create",
        });
      }
    }
    setIsListening(!isListening);
  };

  if (!mode) {
    navigate("/");
    return null;
  }

  const handleSwitchMode = (newModeId: string) => {
    setSwitchModeOpen(false);
    disconnect();
    navigate(`/chat/${newModeId}`);
  };

  const handleEndSession = () => {
    disconnect();
    navigate("/");
  };

  // Determine status text
  const getStatusText = () => {
    if (isConnecting) return "Connecting...";
    if (error) return "Connection error";
    if (isListening) return "Listening...";
    if (isSpeaking) return "Speaking...";
    if (isConnected) return "Ready";
    return "Not connected";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEndSession}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          End session
        </Button>

        <ModeBadge
          icon={mode.icon}
          title={mode.title}
          accentClass={mode.accentClass}
          borderClass={mode.borderClass}
        />

        <SessionTimer startTime={sessionStart} />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-12">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Status indicator */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm">{getStatusText()}</p>
        </div>

        {/* Waveform Visualization */}
        <Waveform
          isActive={isListening || isSpeaking || isConnecting}
          isSpeaking={isSpeaking}
        />

        {/* Push to Talk Button */}
        <div className="flex flex-col items-center gap-3">
          <PushToTalk
            isListening={isListening}
            onToggle={handleToggleListening}
            disabled={!isConnected || isConnecting}
          />
          <p className="text-muted-foreground text-sm">
            {isListening ? "Tap to stop" : "Tap to speak"}
          </p>
        </div>

        {/* Transcript */}
        <Transcript messages={messages} />
      </main>

      {/* Footer Controls */}
      <footer className="flex items-center justify-center gap-4 px-6 py-6 border-t border-border/50">
        <Dialog open={switchModeOpen} onOpenChange={setSwitchModeOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-muted-foreground">
              <RefreshCw className="w-4 h-4 mr-2" />
              Switch mode
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Switch thinking mode</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-3 mt-4">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSwitchMode(m.id)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-lg text-left transition-colors",
                    "bg-secondary/50 hover:bg-secondary border border-border/50",
                    m.id === modeId && "border-primary/50 bg-primary/10"
                  )}
                >
                  <m.icon className={cn("w-5 h-5", m.accentClass)} />
                  <div>
                    <p className="font-medium text-foreground">{m.title}</p>
                    <p className="text-sm text-muted-foreground">{m.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </footer>
    </div>
  );
};

export default VoiceChat;
