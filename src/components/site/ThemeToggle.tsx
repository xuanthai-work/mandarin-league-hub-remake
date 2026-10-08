import { Moon, Sun } from "lucide-react";
import { setTheme, useTheme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Light mode" : "Dark mode"}
      title={dark ? "Chế độ sáng" : "Chế độ tối"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground/80 transition hover:border-gold hover:text-gold ${className}`}
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
