import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { loadGoogleIdentity } from "@/lib/google-identity";
import { getGoogleClientId } from "@/lib/google-link.functions";
import { MEET_SCOPE } from "@/lib/meet-attendance";

export const MEET_TOKEN_STORAGE_KEY = "tml.meet.token";
export const TOKEN_SAFETY_MS = 60_000;

export function readStoredToken(now = Date.now()): string | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    const raw = window.sessionStorage.getItem(MEET_TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const { token, exp } = parsed as { token?: unknown; exp?: unknown };
    if (typeof token !== "string" || !token) return null;
    if (typeof exp !== "number" || !Number.isFinite(exp)) return null;
    if (exp - TOKEN_SAFETY_MS <= now) {
      window.sessionStorage.removeItem(MEET_TOKEN_STORAGE_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function storeToken(
  token: string,
  expiresInSec: number | string | undefined,
  now = Date.now(),
): void {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    const sec = Number(expiresInSec);
    const validSec = Number.isFinite(sec) && sec > 0 ? sec : 3600;
    const exp = now + validSec * 1000;
    window.sessionStorage.setItem(MEET_TOKEN_STORAGE_KEY, JSON.stringify({ token, exp }));
  } catch {
    // Ignore sessionStorage quota or access errors
  }
}

export function clearStoredToken(): void {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    window.sessionStorage.removeItem(MEET_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function useMeetConnection() {
  const fetchClientId = useServerFn(getGoogleClientId);
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const tokenClientRef = useRef<{
    requestAccessToken: (o?: { prompt?: string; hint?: string }) => void;
  } | null>(null);

  const clientIdQ = useQuery({
    queryKey: ["google-client-id"],
    queryFn: () => fetchClientId(),
    staleTime: Infinity,
  });
  const clientId = clientIdQ.data?.clientId ?? null;

  const linkQ = useQuery({
    queryKey: ["my-google-link"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_google_link");
      if (error) throw error;
      return ((data as { google_email?: string }[] | null)?.[0] ?? null) as {
        google_email?: string;
      } | null;
    },
    staleTime: 5 * 60_000,
  });
  const linkedEmail = linkQ.data?.google_email ?? "";

  // Hydrate stored token once after mount
  useEffect(() => {
    const stored = readStoredToken();
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let alive = true;
    loadGoogleIdentity()
      .then((g) => {
        if (!alive) return;
        tokenClientRef.current = g.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: MEET_SCOPE,
          ...(linkedEmail ? { hint: linkedEmail } : {}),
          callback: (r) => {
            if (r.access_token) {
              setError("");
              storeToken(r.access_token, r.expires_in);
              setToken(r.access_token);
            } else {
              setError(r.error_description || "Google không cấp quyền đọc buổi họp.");
            }
          },
          error_callback: (e) =>
            setError(
              e.type === "popup_closed"
                ? "Bạn đã đóng cửa sổ Google."
                : "Không mở được cửa sổ Google.",
            ),
        });
        setReady(true);
      })
      .catch((e: Error) => alive && setError(e.message));

    return () => {
      alive = false;
    };
  }, [clientId, linkedEmail]);

  const connect = () => {
    tokenClientRef.current?.requestAccessToken({ prompt: "" });
  };

  const switchAccount = () => {
    tokenClientRef.current?.requestAccessToken({ prompt: "select_account", hint: "" });
  };

  const disconnect = () => {
    clearStoredToken();
    setToken("");
    setError("");
  };

  const expire = () => {
    clearStoredToken();
    setToken("");
  };

  return {
    token,
    ready,
    error,
    connect,
    switchAccount,
    disconnect,
    expire,
  };
}
