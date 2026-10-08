import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
const KEY = "tml-theme";
const EVT = "tml-theme-change";

/** Inline script run before paint so the stored theme never flashes. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export function setTheme(t: Theme) {
  localStorage.setItem(KEY, t);
  document.documentElement.classList.toggle("dark", t === "dark");
  window.dispatchEvent(new CustomEvent(EVT, { detail: t }));
}

/** Light on SSR, real value after hydration (no mismatch). */
export function useTheme(): Theme {
  const [theme, set] = useState<Theme>("light");
  useEffect(() => {
    set(document.documentElement.classList.contains("dark") ? "dark" : "light");
    const on = (e: Event) => set((e as CustomEvent<Theme>).detail);
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return theme;
}
