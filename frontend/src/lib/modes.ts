import { Swords, Layers, Search, Waves } from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface Mode {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accentClass: string;
  borderClass: string;
}

export const modes: Mode[] = [
  {
    id: "devils-advocate",
    title: "Devil's Advocate",
    description: "I'll oppose every argument you make and force you to defend your thinking",
    icon: Swords,
    accentClass: "text-[hsl(175,70%,42%)]",
    borderClass: "border-[hsl(175,70%,42%)]",
  },
  {
    id: "first-principles",
    title: "First Principles Thinker",
    description: "Let's strip away assumptions and rebuild from fundamentals",
    icon: Layers,
    accentClass: "text-[hsl(180,65%,40%)]",
    borderClass: "border-[hsl(180,65%,40%)]",
  },
  {
    id: "edge-case",
    title: "Edge Case Hunter",
    description: "I'll find the flaws and blind spots in your reasoning",
    icon: Search,
    accentClass: "text-[hsl(185,60%,45%)]",
    borderClass: "border-[hsl(185,60%,45%)]",
  },
  {
    id: "second-order",
    title: "Second-Order Thinker",
    description: "Let's explore the ripple effects you haven't considered",
    icon: Waves,
    accentClass: "text-[hsl(190,70%,48%)]",
    borderClass: "border-[hsl(190,70%,48%)]",
  },
];

export const getModeById = (id: string): Mode | undefined => {
  return modes.find((mode) => mode.id === id);
};
