import { Check, Globe, Moon, Sun } from "lucide-react";
import { setLang, useLang, useTr, type Lang } from "@/lib/i18n";
import { setTheme, useTheme } from "@/lib/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function Flag({ code }: { code: Lang }) {
  const cls = "h-4 w-6 shrink-0 overflow-hidden rounded-[3px] shadow-sm ring-1 ring-border";
  if (code === "vi") return (<svg viewBox="0 0 30 20" className={cls}><rect width="30" height="20" fill="#DA251D" /><polygon fill="#FFFF00" points="15,4 16.2,8.2 20.5,8.2 17,10.7 18.3,15 15,12.4 11.7,15 13,10.7 9.5,8.2 13.8,8.2" /></svg>);
  if (code === "zh") return (<svg viewBox="0 0 30 20" className={cls}><rect width="30" height="20" fill="#DE2910" /><polygon fill="#FFDE00" points="5,2 5.9,4.8 8.8,4.8 6.5,6.5 7.4,9.3 5,7.6 2.6,9.3 3.5,6.5 1.2,4.8 4.1,4.8" /><circle cx="10" cy="2" r=".8" fill="#FFDE00" /><circle cx="12" cy="4" r=".8" fill="#FFDE00" /><circle cx="12" cy="7" r=".8" fill="#FFDE00" /><circle cx="10" cy="9" r=".8" fill="#FFDE00" /></svg>);
  return (<svg viewBox="0 0 60 30" className={cls}><rect width="60" height="30" fill="#012169" /><path d="M0,0 60,30M60,0 0,30" stroke="#fff" strokeWidth="6" /><path d="M0,0 60,30M60,0 0,30" stroke="#C8102E" strokeWidth="2" /><path d="M30,0v30M0,15h60" stroke="#fff" strokeWidth="10" /><path d="M30,0v30M0,15h60" stroke="#C8102E" strokeWidth="6" /></svg>);
}

const OPTIONS: { code: Lang; name: string; short: string }[] = [
  { code: "vi", name: "Tiếng Việt", short: "VI" },
  { code: "zh", name: "中文", short: "中" },
  { code: "en", name: "English", short: "EN" },
];

/**
 * Single control for language + light/dark theme, used in the header (desktop)
 * and inside the mobile drawer. Both stores are client-only with SSR-safe hooks,
 * so nothing here can cause a hydration mismatch.
 */
export function SitePreferences({ className = "" }: { className?: string }) {
  const lang = useLang();
  const theme = useTheme();
  const tr = useTr();
  const cur = OPTIONS.find((o) => o.code === lang) ?? OPTIONS[0]!;
  const dark = theme === "dark";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${tr("Ngôn ngữ")} / ${tr("Giao diện")}`}
        className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-xs font-semibold text-foreground/80 transition hover:border-gold hover:text-gold focus:outline-none ${className}`}
      >
        <Globe className="h-[18px] w-[18px]" />
        <Flag code={cur.code} />
        <span className={cur.code === "zh" ? "font-han" : ""}>{cur.short}</span>
        {dark ? <Moon className="h-[18px] w-[18px] text-primary" /> : <Sun className="h-[18px] w-[18px] text-primary" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">{tr("Ngôn ngữ")}</DropdownMenuLabel>
        {OPTIONS.map((o) => (
          <DropdownMenuItem key={o.code} onClick={() => setLang(o.code)} className="gap-3 py-2">
            <Flag code={o.code} />
            <span className={`flex-1 ${o.code === "zh" ? "font-han" : ""}`}>{o.name}</span>
            {lang === o.code && <Check className="h-4 w-4 text-gold" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">{tr("Giao diện")}</DropdownMenuLabel>
        {([["light", "Chế độ sáng", Sun], ["dark", "Chế độ tối", Moon]] as const).map(([value, label, Icon]) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)} className="gap-3 py-2">
            <Icon className="h-4 w-4 text-primary" />
            <span className="flex-1">{tr(label)}</span>
            {theme === value && <Check className="h-4 w-4 text-gold" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
