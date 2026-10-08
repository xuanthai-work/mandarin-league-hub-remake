import { Check, Globe } from "lucide-react";
import { setLang, useLang, type Lang } from "@/lib/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function Flag({ code }: { code: Lang }) {
  const cls = "h-4 w-6 shrink-0 overflow-hidden rounded-[3px] shadow-sm ring-1 ring-border";
  if (code === "vi") return (<svg viewBox="0 0 30 20" className={cls}><rect width="30" height="20" fill="#DA251D" /><polygon fill="#FFFF00" points="15,4 16.2,8.2 20.5,8.2 17,10.7 18.3,15 15,12.4 11.7,15 13,10.7 9.5,8.2 13.8,8.2" /></svg>);
  if (code === "zh") return (<svg viewBox="0 0 30 20" className={cls}><rect width="30" height="20" fill="#DE2910" /><polygon fill="#FFDE00" points="5,2 5.9,4.8 8.8,4.8 6.5,6.5 7.4,9.3 5,7.6 2.6,9.3 3.5,6.5 1.2,4.8 4.1,4.8" /><circle cx="10" cy="2" r=".8" fill="#FFDE00" /><circle cx="12" cy="4" r=".8" fill="#FFDE00" /><circle cx="12" cy="7" r=".8" fill="#FFDE00" /><circle cx="10" cy="9" r=".8" fill="#FFDE00" /></svg>);
  return (<svg viewBox="0 0 60 30" className={cls}><rect width="60" height="30" fill="#012169" /><path d="M0,0 60,30M60,0 0,30" stroke="#fff" strokeWidth="6" /><path d="M0,0 60,30M60,0 0,30" stroke="#C8102E" strokeWidth="2" /><path d="M30,0v30M0,15h60" stroke="#fff" strokeWidth="10" /><path d="M30,0v30M0,15h60" stroke="#C8102E" strokeWidth="6" /></svg>);
}

const OPTIONS: { code: Lang; flag: string; name: string; short: string }[] = [
  { code: "vi", flag: "🇻🇳", name: "Tiếng Việt", short: "VI" },
  { code: "zh", flag: "🇨🇳", name: "中文", short: "中" },
  { code: "en", flag: "🇬🇧", name: "English", short: "EN" },
];

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const lang = useLang();
  const cur = OPTIONS.find((o) => o.code === lang) ?? OPTIONS[0]!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Ngôn ngữ / 语言 / Language"
        className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-xs font-semibold text-foreground/80 transition hover:border-gold hover:text-gold focus:outline-none ${className}`}
      >
        <Globe className="h-[18px] w-[18px]" />
        <Flag code={cur.code} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {OPTIONS.map((o) => (
          <DropdownMenuItem key={o.code} onClick={() => setLang(o.code)} className="gap-3 py-2">
            <Flag code={o.code} />
            <span className={`flex-1 ${o.code === "zh" ? "font-han" : ""}`}>{o.name}</span>
            {lang === o.code && <Check className="h-4 w-4 text-gold" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
