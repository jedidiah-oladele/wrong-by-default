import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModeBadgeProps {
  icon: LucideIcon;
  title: string;
  accentClass: string;
  borderClass: string;
  onClick?: () => void;
  clickable?: boolean;
}

const ModeBadge = ({ icon: Icon, title, accentClass, borderClass, onClick, clickable }: ModeBadgeProps) => {
  const isClickable = clickable || onClick !== undefined;
  
  return (
    <div 
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-secondary/50 backdrop-blur-sm",
        "border-2",
        borderClass,
        isClickable && "cursor-pointer hover:bg-secondary/70 transition-colors"
      )}
    >
      <Icon className={cn("w-4 h-4", accentClass)} />
      <span className="text-sm font-medium text-foreground">{title}</span>
    </div>
  );
};

export default ModeBadge;
