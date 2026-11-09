import { useEffect, useState } from "react";
import { DICT, type DictKey } from "./dict";

export type Lang = "vi" | "zh" | "en";
export const LANGS: { code: Lang; label: string; html: string }[] = [
  { code: "vi", label: "VI", html: "vi" },
  { code: "zh", label: "中", html: "zh-CN" },
  { code: "en", label: "EN", html: "en" },
];
const KEY = "tml-lang";
const EVT = "tml-lang-change";

function readLang(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "vi" || v === "zh" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return "vi";
}

export function setLang(l: Lang) {
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* ignore */
  }
  document.cookie = `${KEY}=${l}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = LANGS.find((x) => x.code === l)?.html ?? "vi";
  window.dispatchEvent(new CustomEvent(EVT, { detail: l }));
}

/** Vietnamese on first render (SSR-safe), then switches to the stored choice after hydration. */
export function useLang(): Lang {
  const [lang, set] = useState<Lang>("vi");
  useEffect(() => {
    const l = readLang();
    set(l);
    document.documentElement.lang = LANGS.find((x) => x.code === l)?.html ?? "vi";
    const on = (e: Event) => set((e as CustomEvent<Lang>).detail);
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return lang;
}

export function useT() {
  const lang = useLang();
  return { lang, t: (k: DictKey) => DICT[k][lang] ?? DICT[k].vi };
}

import { PHRASES } from "./phrases";
/** Translate a Vietnamese source phrase; falls back to the original text. */
function trPhrase(lang: Lang, vi: string): string {
  if (lang === "vi") return vi;
  const p = PHRASES[vi];
  return p ? (lang === "zh" ? p[0] : p[1]) : vi;
}
export function useTr() {
  const lang = useLang();
  return (vi: string) => trPhrase(lang, vi);
}
