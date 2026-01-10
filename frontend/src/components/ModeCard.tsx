import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ModeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accentClass: string;
  onClick: () => void;
}

const ModeCard = ({ icon: Icon, title, description, accentClass, onClick }: ModeCardProps) => {
  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-xl",
        "bg-card/50 backdrop-blur-sm border-border/50",
        "hover:border-primary/30"
      )}
    >
      {/* Subtle glow effect on hover */}
      <div 
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          "bg-gradient-to-br from-primary/5 via-transparent to-transparent"
        )}
      />
      
      <CardHeader className="relative pb-3">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
          "bg-secondary/80 border border-border/50",
          "group-hover:border-primary/30 transition-colors duration-300"
        )}>
          <Icon className={cn("w-6 h-6", accentClass)} />
        </div>
        <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative pt-0">
        <CardDescription className="text-muted-foreground text-base leading-relaxed mb-6">
          {description}
        </CardDescription>
        <Button 
          onClick={onClick}
          variant="outline"
          className={cn(
            "w-full border-primary/30 text-foreground",
            "hover:bg-primary/10 hover:border-primary/50",
            "transition-all duration-300"
          )}
        >
          Start conversation
        </Button>
      </CardContent>
    </Card>
  );
};

export default ModeCard;
