import { cn } from "@/lib/utils";

interface WaveformProps {
  isActive: boolean;
  isSpeaking: boolean;
}

const Waveform = ({ isActive, isSpeaking }: WaveformProps) => {
  const barCount = 40;
  
  return (
    <div className="flex items-center justify-center gap-1 h-48 w-full max-w-md mx-auto">
      {Array.from({ length: barCount }).map((_, i) => {
        // Create a wave pattern with varying delays
        const delay = (i * 0.05) % 1.2;
        const baseHeight = Math.sin((i / barCount) * Math.PI) * 100;
        
        return (
          <div
            key={i}
            className={cn(
              "w-1 rounded-full transition-all duration-300",
              isActive && isSpeaking 
                ? "bg-primary animate-waveform" 
                : isActive 
                  ? "bg-primary/40 h-4"
                  : "bg-muted h-2"
            )}
            style={{
              height: isActive && isSpeaking ? `${20 + baseHeight}%` : undefined,
              animationDelay: isActive && isSpeaking ? `${delay}s` : undefined,
            }}
          />
        );
      })}
    </div>
  );
};

export default Waveform;
