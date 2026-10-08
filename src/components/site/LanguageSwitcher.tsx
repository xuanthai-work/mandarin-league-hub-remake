import { LANGS, setLang, useLang } from "@/lib/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const lang = useLang();
  return (
    <div role="group" aria-label="Ngôn ngữ / 语言 / Language" className={`inline-flex rounded-full border border-border bg-background p-0.5 text-xs font-semibold ${className}`}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          className={`rounded-full px-2.5 py-1 transition ${lang === l.code ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-primary"} ${l.code === "zh" ? "font-han" : ""}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
