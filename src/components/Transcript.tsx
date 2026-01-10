import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface TranscriptProps {
  messages: Message[];
}

const Transcript = ({ messages }: TranscriptProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-muted-foreground hover:text-foreground mb-2"
      >
        <span className="text-sm">Transcript</span>
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </Button>
      
      {isExpanded && (
        <ScrollArea className="h-48 rounded-lg bg-secondary/30 border border-border/50 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "text-sm",
                  message.role === "user" 
                    ? "text-foreground" 
                    : "text-primary"
                )}
              >
                <span className="font-medium text-muted-foreground mr-2">
                  {message.role === "user" ? "You:" : "AI:"}
                </span>
                {message.content}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default Transcript;
