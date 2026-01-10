import { Github, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

const Footer = ({ className }: FooterProps) => {
  return (
    <footer className={cn("py-4 text-center text-muted-foreground text-sm", className)}>
      <div className="flex flex-col items-center gap-4">
        <p>wrongbydefault.com — Think differently</p>
        <div className="flex items-center gap-10">
          <a
            href="https://github.com/jedidiah-oladele/wrong-by-default"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="GitHub repository"
          >
            <Github className="w-5 h-5" />
          </a>
          <a
            href="mailto:developer.jedidiah@gmail.com"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Email developer"
          >
            <Mail className="w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
