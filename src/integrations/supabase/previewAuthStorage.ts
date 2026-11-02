/**
 * Storage for the Supabase browser client's auth session.
 *
 * Standard `localStorage` is the only backend: it persists the session across
 * tabs and reloads for every origin the app is served from. During SSR there is
 * no browser storage, so `undefined` lets Supabase fall back to memory.
 */
export type PreviewAuthStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function browserAuthStorage(): PreviewAuthStorage | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}
