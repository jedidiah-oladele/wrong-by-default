import { useEffect, useState, useRef } from "react";
import { Clock } from "lucide-react";

interface SessionTimerProps {
  startTime: Date;
  isPaused?: boolean;
}

const SessionTimer = ({ startTime, isPaused = false }: SessionTimerProps) => {
  const [elapsed, setElapsed] = useState("00:00");
  const pauseStartRef = useRef<number | null>(null);
  const totalPauseTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isPaused) {
      // Record when pause started (only once)
      if (pauseStartRef.current === null) {
        pauseStartRef.current = Date.now();
      }
      return; // Don't run interval when paused
    }

    // When resuming, add the pause duration to total pause time
    if (pauseStartRef.current !== null) {
      const pauseDuration = Date.now() - pauseStartRef.current;
      totalPauseTimeRef.current += pauseDuration;
      pauseStartRef.current = null;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const totalElapsed = now - startTime.getTime();
      const activeTime = Math.floor((totalElapsed - totalPauseTimeRef.current) / 1000);
      
      const minutes = Math.floor(activeTime / 60).toString().padStart(2, "0");
      const seconds = (activeTime % 60).toString().padStart(2, "0");
      setElapsed(`${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isPaused]);

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Clock className="w-4 h-4" />
      <span className="text-sm font-mono">{elapsed}</span>
    </div>
  );
};

export default SessionTimer;
