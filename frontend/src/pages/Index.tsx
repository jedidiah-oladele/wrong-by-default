import { useNavigate } from "react-router-dom";
import ModeCard from "@/components/ModeCard";
import { modes } from "@/lib/modes";

const Index = () => {
  const navigate = useNavigate();

  const handleModeSelect = (modeId: string) => {
    navigate(`/chat/${modeId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center px-6 pt-24 pb-16">
        <div className="text-center max-w-2xl mx-auto animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            Challenge your assumptions
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
            Voice AI that pushes back on your thinking
          </p>
        </div>
      </div>

      {/* Mode Cards Grid */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modes.map((mode, index) => (
            <div
              key={mode.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <ModeCard
                icon={mode.icon}
                title={mode.title}
                description={mode.description}
                accentClass={mode.accentClass}
                onClick={() => handleModeSelect(mode.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Subtle footer */}
      <footer className="py-8 text-center text-muted-foreground text-sm">
        <p>wrongbydefault.com — Think differently</p>
      </footer>
    </div>
  );
};

export default Index;
