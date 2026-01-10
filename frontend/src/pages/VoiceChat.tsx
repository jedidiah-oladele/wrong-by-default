import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ModeBadge from "@/components/ModeBadge";
import SessionTimer from "@/components/SessionTimer";
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
import { cn } from "@/lib/utils";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";

const VoiceChat = () => {
  const { modeId } = useParams<{ modeId: string }>();
  const navigate = useNavigate();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [sessionStart] = useState(new Date());
  const [switchModeOpen, setSwitchModeOpen] = useState(false);
  // User audio analysis refs
  const userAudioContextRef = useRef<AudioContext | null>(null);
  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  const userSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const userAnimationFrameRef = useRef<number | null>(null);
  // AI audio analysis refs
  const aiAudioContextRef = useRef<AudioContext | null>(null);
  const aiAnalyserRef = useRef<AnalyserNode | null>(null);
  const aiSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const aiAnimationFrameRef = useRef<number | null>(null);

  const mode = getModeById(modeId || "");

  const {
    isConnected,
    isConnecting,
    error,
    messages,
    connect,
    disconnect,
    mediaStream,
    audioElement,
  } = useRealtimeConnection({
    modeId: modeId || "",
    onMessage: (message) => {
      // Message events are handled for transcript, audio detection is done via Web Audio API
    },
    onError: (err) => {
      console.error("Realtime connection error:", err);
    },
  });

  // Dummy data for preview - remove when done testing
  const dummyMessages = messages.length === 0 ? [
    {
      id: "dummy-1",
      role: "user" as const,
      content: "Hello, can you help me think through a complex problem I've been wrestling with? I've been going back and forth on this for weeks and could really use a fresh perspective.",
    },
    {
      id: "dummy-2",
      role: "assistant" as const,
      content: "Of course! I'd be happy to help you think through your problem. Complex decisions often benefit from breaking them down into smaller, more manageable pieces. What's the situation you're dealing with? Feel free to share as much detail as you'd like - the more context I have, the better I can help you think through it.",
    },
    {
      id: "dummy-3",
      role: "user" as const,
      content: "I'm trying to decide whether to take a new job offer. The salary is significantly higher - about 30% more than what I'm making now - and it's at a more prestigious company with better growth opportunities. However, I'd have to relocate across the country, away from my family and friends. I've built a really strong support network here, and I'm worried about starting over in a new city where I don't know anyone.",
    },
    {
      id: "dummy-4",
      role: "assistant" as const,
      content: "That's a significant decision with multiple important factors to consider. Let's break this down systematically. You've identified several key elements: financial benefits, career advancement, and personal relationships. Each of these carries different weight depending on your values and long-term goals. Have you considered what your priorities are for the next 5-10 years? Also, is the relocation permanent, or could you potentially negotiate remote work arrangements or periodic visits back home?",
    },
    {
      id: "dummy-5",
      role: "user" as const,
      content: "That's a good point about remote work. I haven't really explored that option yet. The company did mention they have a flexible work policy, but I'm not sure if that extends to full remote work or just hybrid. I should probably ask about that. As for my priorities, I'm in my early 30s and I do want to advance my career, but I also value having a strong personal support system. It's hard to know which should take precedence.",
    },
    {
      id: "dummy-6",
      role: "assistant" as const,
      content: "I see. So you're weighing financial benefits and career growth against personal relationships and support systems. This is a classic tension between professional advancement and personal fulfillment. One way to think about this is to consider whether this move would be reversible - if you took the job and found you really missed your support network, could you move back? Also, have you considered that you might be able to build new relationships in the new city while maintaining your existing ones through regular visits and technology? Sometimes we frame these as either/or decisions when there might be creative solutions that address both concerns.",
    },
  ] : messages;

  // Set up audio analysis to detect when user is speaking
  useEffect(() => {
    if (isConnected && mediaStream) {
      // Initialize AudioContext
      if (!userAudioContextRef.current) {
        userAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = userAudioContextRef.current;

      // Create analyser node
      if (!userAnalyserRef.current) {
        userAnalyserRef.current = audioContext.createAnalyser();
        userAnalyserRef.current.fftSize = 256;
        userAnalyserRef.current.smoothingTimeConstant = 0.3;
      }

      // Connect microphone
      if (!userSourceRef.current) {
        try {
          userSourceRef.current = audioContext.createMediaStreamSource(mediaStream);
          userSourceRef.current.connect(userAnalyserRef.current);
        } catch (error) {
          console.error("Error connecting microphone to analyser:", error);
        }
      }

      const analyser = userAnalyserRef.current;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Monitor audio levels
      const checkAudioLevel = () => {
        if (!analyser) return;

        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Threshold for detecting speech (adjust as needed)
        const threshold = 20;
        setIsUserSpeaking(average > threshold);

        userAnimationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };

      userAnimationFrameRef.current = requestAnimationFrame(checkAudioLevel);
    }

    return () => {
      if (userAnimationFrameRef.current) {
        cancelAnimationFrame(userAnimationFrameRef.current);
        userAnimationFrameRef.current = null;
      }
      if (userSourceRef.current) {
        userSourceRef.current.disconnect();
        userSourceRef.current = null;
      }
      if (userAnalyserRef.current) {
        userAnalyserRef.current.disconnect();
        userAnalyserRef.current = null;
      }
      if (userAudioContextRef.current && userAudioContextRef.current.state !== "closed") {
        userAudioContextRef.current.close();
        userAudioContextRef.current = null;
      }
      setIsUserSpeaking(false);
    };
  }, [isConnected, mediaStream]);

  // Set up audio analysis to detect when AI is speaking
  useEffect(() => {
    if (isConnected && audioElement && audioElement.srcObject) {
      // Initialize AudioContext for AI audio
      if (!aiAudioContextRef.current) {
        aiAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = aiAudioContextRef.current;

      // Create analyser node
      if (!aiAnalyserRef.current) {
        aiAnalyserRef.current = audioContext.createAnalyser();
        aiAnalyserRef.current.fftSize = 256;
        aiAnalyserRef.current.smoothingTimeConstant = 0.3;
      }

      // Connect AI audio stream
      if (!aiSourceRef.current && audioElement.srcObject instanceof MediaStream) {
        try {
          aiSourceRef.current = audioContext.createMediaStreamSource(audioElement.srcObject);
          aiSourceRef.current.connect(aiAnalyserRef.current);
        } catch (error) {
          console.error("Error connecting AI audio to analyser:", error);
        }
      }

      const analyser = aiAnalyserRef.current;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Monitor AI audio levels
      const checkAIAudioLevel = () => {
        if (!analyser) return;

        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Threshold for detecting AI speech (may need different threshold than user)
        const threshold = 15;
        setIsSpeaking(average > threshold);

        aiAnimationFrameRef.current = requestAnimationFrame(checkAIAudioLevel);
      };

      aiAnimationFrameRef.current = requestAnimationFrame(checkAIAudioLevel);
    }

    return () => {
      if (aiAnimationFrameRef.current) {
        cancelAnimationFrame(aiAnimationFrameRef.current);
        aiAnimationFrameRef.current = null;
      }
      if (aiSourceRef.current) {
        aiSourceRef.current.disconnect();
        aiSourceRef.current = null;
      }
      if (aiAnalyserRef.current) {
        aiAnalyserRef.current.disconnect();
        aiAnalyserRef.current = null;
      }
      if (aiAudioContextRef.current && aiAudioContextRef.current.state !== "closed") {
        aiAudioContextRef.current.close();
        aiAudioContextRef.current = null;
      }
      setIsSpeaking(false);
    };
  }, [isConnected, audioElement]);


  // Handle button click: connect or disconnect
  const handleButtonClick = () => {
    // If not connected, connect
    if (!isConnected && !isConnecting) {
      connect();
      return;
    }

    // If connected, disconnect (end session)
      if (isConnected) {
      disconnect();
      return;
      }
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

  // Determine status text below mic button
  const getStatusText = () => {
    if (isConnecting) return "Connecting...";
    if (error) return "Could not connect - please try again";
    if (isConnected) return "Connected, tap to end";
    return "Tap to speak";
  };

  // Determine text color based on state
  const getStatusTextColor = () => {
    if (error) return "text-destructive";
    if (isConnected) return "text-green-500";
    return "text-muted-foreground";
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="relative flex items-center justify-between px-6 py-4 border-b border-border/50 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEndSession}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          End session
        </Button>

        <div className="absolute left-1/2 -translate-x-1/2">
          <Dialog open={switchModeOpen} onOpenChange={setSwitchModeOpen}>
            <DialogTrigger asChild>
              <button type="button" className="focus:outline-none">
        <ModeBadge
          icon={mode.icon}
          title={mode.title}
          accentClass={mode.accentClass}
          borderClass={mode.borderClass}
                  clickable
                />
              </button>
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
        </div>

        <SessionTimer startTime={sessionStart} isPaused={!isConnected} />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-6 pt-6 pb-4 gap-10 min-h-0">
        {/* Push to Talk Button */}
        <div className="flex flex-col items-center gap-6 pt-4 flex-shrink-0">
          <PushToTalk
            onToggle={handleButtonClick}
            isConnected={isConnected}
            error={error}
            disabled={isConnecting}
            isAudioActive={isUserSpeaking || isSpeaking}
          />
          <p className={cn("text-sm transition-colors", getStatusTextColor())}>
            {getStatusText()}
          </p>
        </div>

        {/* Transcript */}
        <div className="flex-1 w-full max-w-4xl min-h-0">
          <Transcript messages={dummyMessages} />
        </div>
      </main>
    </div>
  );
};

export default VoiceChat;
