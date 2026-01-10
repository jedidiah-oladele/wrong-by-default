import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface PushToTalkProps {
  isListening: boolean;
  onToggle: () => void;
}

const PushToTalk = ({ isListening, onToggle }: PushToTalkProps) => {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative w-20 h-20 rounded-full transition-all duration-300",
        "flex items-center justify-center",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background",
        isListening 
          ? "bg-primary text-primary-foreground animate-glow" 
          : "bg-secondary hover:bg-secondary/80 text-foreground border border-border"
      )}
    >
      {/* Pulse rings when listening */}
      {isListening && (
        <>
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
          <span className="absolute inset-2 rounded-full bg-primary/20 animate-pulse" />
        </>
      )}
      
      <Mic className="w-8 h-8 relative z-10" />
    </button>
  );
};

export default PushToTalk;
