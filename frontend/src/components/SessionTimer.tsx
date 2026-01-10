import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface SessionTimerProps {
  startTime: Date;
}

const SessionTimer = ({ startTime }: SessionTimerProps) => {
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const minutes = Math.floor(diff / 60).toString().padStart(2, "0");
      const seconds = (diff % 60).toString().padStart(2, "0");
      setElapsed(`${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Clock className="w-4 h-4" />
      <span className="text-sm font-mono">{elapsed}</span>
    </div>
  );
};

export default SessionTimer;
