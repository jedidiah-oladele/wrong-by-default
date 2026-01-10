import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import ModeBadge from "@/components/ModeBadge";
import SessionTimer from "@/components/SessionTimer";
import Waveform from "@/components/Waveform";
import PushToTalk from "@/components/PushToTalk";
import Transcript from "@/components/Transcript";
import { getModeById, modes } from "@/lib/modes";
import { mockTranscripts } from "@/lib/mockTranscript";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const VoiceChat = () => {
  const { modeId } = useParams<{ modeId: string }>();
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionStart] = useState(new Date());
  const [switchModeOpen, setSwitchModeOpen] = useState(false);

  const mode = getModeById(modeId || "");

  // Simulate AI speaking periodically when not listening
  useEffect(() => {
    if (!isListening) {
      const speakInterval = setInterval(() => {
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 2000 + Math.random() * 2000);
      }, 5000);

      return () => clearInterval(speakInterval);
    } else {
      setIsSpeaking(false);
    }
  }, [isListening]);

  if (!mode) {
    navigate("/");
    return null;
  }

  const transcript = mockTranscripts[modeId || ""] || [];

  const handleSwitchMode = (newModeId: string) => {
    setSwitchModeOpen(false);
    navigate(`/chat/${newModeId}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
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
        {/* Status indicator */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            {isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Ready"}
          </p>
        </div>

        {/* Waveform Visualization */}
        <Waveform isActive={isListening || isSpeaking} isSpeaking={isSpeaking} />

        {/* Push to Talk Button */}
        <div className="flex flex-col items-center gap-3">
          <PushToTalk
            isListening={isListening}
            onToggle={() => setIsListening(!isListening)}
          />
          <p className="text-muted-foreground text-sm">
            {isListening ? "Tap to stop" : "Tap to speak"}
          </p>
        </div>

        {/* Transcript */}
        <Transcript messages={transcript} />
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
