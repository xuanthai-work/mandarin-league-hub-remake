import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export const RECAPTCHA_SITE_KEY = "6LeuDeUtAAAAAFaxBcOMSkdRwnwaIXawor3dQwXI";

type G = { render: (el: HTMLElement, o: Record<string, unknown>) => number; reset: (id?: number) => void };
declare global { interface Window { grecaptcha?: G; __tmlRecaptchaReady?: () => void } }

let loader: Promise<G> | null = null;
function load(): Promise<G> {
  if (loader) return loader;
  loader = new Promise((resolve) => {
    if (window.grecaptcha?.render) return resolve(window.grecaptcha);
    window.__tmlRecaptchaReady = () => resolve(window.grecaptcha!);
    const s = document.createElement("script");
    s.src = "https://www.google.com/recaptcha/api.js?onload=__tmlRecaptchaReady&render=explicit&hl=vi";
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  });
  return loader;
}

export type RecaptchaHandle = { reset: () => void };

/** Google reCAPTCHA v2 checkbox. Calls onChange with the token, or "" when it expires/resets. */
export const Recaptcha = forwardRef<RecaptchaHandle, { onChange: (token: string) => void }>(function Recaptcha({ onChange }, ref) {
  const el = useRef<HTMLDivElement>(null);
  const id = useRef<number | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useImperativeHandle(ref, () => ({
    reset: () => { if (id.current !== null) window.grecaptcha?.reset(id.current); cb.current(""); },
  }));

  useEffect(() => {
    let alive = true;
    void load().then((g) => {
      if (!alive || !el.current || id.current !== null) return;
      id.current = g.render(el.current, {
        sitekey: RECAPTCHA_SITE_KEY,
        callback: (t: string) => cb.current(t),
        "expired-callback": () => cb.current(""),
        "error-callback": () => cb.current(""),
      });
    });
    return () => { alive = false; };
  }, []);

  return <div ref={el} className="min-h-[78px]" />;
});
