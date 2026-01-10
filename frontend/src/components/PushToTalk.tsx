import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef, useCallback } from "react";

interface PushToTalkProps {
  onToggle: () => void;
  disabled?: boolean;
  isConnected?: boolean;
  error?: string | null;
  isAudioActive?: boolean;
}

const PushToTalk = ({ 
  onToggle, 
  disabled = false,
  isConnected = false,
  error = null,
  isAudioActive = false
}: PushToTalkProps) => {
  const [waves, setWaves] = useState<number[]>([]);
  const waveIdCounter = useRef(0);
  const waveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create waves continuously while audio is active
  useEffect(() => {
    if (isAudioActive && isConnected) {
      // Create initial wave immediately
      const initialWaveId = waveIdCounter.current++;
      setWaves((prev) => [...prev, initialWaveId]);

      // Create new waves periodically while audio is active
      waveIntervalRef.current = setInterval(() => {
        const newWaveId = waveIdCounter.current++;
        setWaves((prev) => [...prev, newWaveId]);
      }, 1000); // Create a new wave every second
    } else {
      // Stop creating waves when audio is not active
      if (waveIntervalRef.current) {
        clearInterval(waveIntervalRef.current);
        waveIntervalRef.current = null;
      }
    }

    return () => {
      if (waveIntervalRef.current) {
        clearInterval(waveIntervalRef.current);
        waveIntervalRef.current = null;
      }
    };
  }, [isAudioActive, isConnected]);

  // Remove wave after animation completes (2 seconds for ping animation)
  // Use useCallback to prevent the callback from changing on every render
  const removeWave = useCallback((waveId: number) => {
    setWaves((prev) => prev.filter((id) => id !== waveId));
  }, []);

  // Determine button color based on state
  const getButtonColor = () => {
    if (error) return "bg-destructive text-destructive-foreground";
    if (isConnected) return "bg-green-500 text-white";
    return "bg-secondary hover:bg-secondary/80 text-foreground border border-border";
  };

  // Determine icon color
  const getIconColor = () => {
    if (error) return "text-destructive-foreground";
    if (isConnected) return "text-white";
    return "text-muted-foreground";
  };

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "relative w-20 h-20 rounded-full transition-all duration-300",
        "flex items-center justify-center",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
        disabled && "opacity-50 cursor-not-allowed",
        getButtonColor(),
        isAudioActive && isConnected && "animate-glow"
      )}
    >
      {/* Independent pulse rings - each completes its animation cycle */}
      {waves.map((waveId) => (
        <WaveRing
          key={waveId}
          waveId={waveId}
          onComplete={removeWave}
        />
      ))}
      
      <Mic className={cn("w-8 h-8 relative z-10", getIconColor())} />
    </button>
  );
};

// Individual wave ring component that completes its animation independently
const WaveRing = ({ waveId, onComplete }: { waveId: number; onComplete: (id: number) => void }) => {
  useEffect(() => {
    // Ping animation duration is ~1s, but we'll wait a bit longer to ensure it fades
    const timer = setTimeout(() => {
      onComplete(waveId);
    }, 2000); // 2 seconds for the wave to complete and fade

    return () => clearTimeout(timer);
  }, [waveId, onComplete]);

  return (
    <>
      <span className="absolute inset-0 rounded-full bg-green-500/30 animate-ping" />
      <span className="absolute inset-2 rounded-full bg-green-500/20 animate-pulse" />
    </>
  );
};

export default PushToTalk;
