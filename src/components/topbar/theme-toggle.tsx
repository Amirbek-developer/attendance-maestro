import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/providers/theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme" className="text-muted-foreground hover:text-foreground">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
