import { Check, Globe } from "lucide-react";
import { setLang, useLang, type Lang } from "@/lib/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const OPTIONS: { code: Lang; flag: string; name: string; short: string }[] = [
  { code: "vi", flag: "🇻🇳", name: "Tiếng Việt", short: "VI" },
  { code: "zh", flag: "🇨🇳", name: "中文", short: "中" },
  { code: "en", flag: "🇬🇧", name: "English", short: "EN" },
];

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const lang = useLang();
  const cur = OPTIONS.find((o) => o.code === lang) ?? OPTIONS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Ngôn ngữ / 语言 / Language"
        className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-xs font-semibold text-foreground/80 transition hover:border-gold hover:text-gold focus:outline-none ${className}`}
      >
        <Globe className="h-[18px] w-[18px]" />
        <span className={cur.code === "zh" ? "font-han" : ""}>{cur.short}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {OPTIONS.map((o) => (
          <DropdownMenuItem key={o.code} onClick={() => setLang(o.code)} className="gap-3 py-2">
            <span className="text-lg leading-none">{o.flag}</span>
            <span className={`flex-1 ${o.code === "zh" ? "font-han" : ""}`}>{o.name}</span>
            {lang === o.code && <Check className="h-4 w-4 text-gold" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
