export type GoogleCredentialResponse = { credential: string };
export type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

export type GoogleIdentityApi = {
  accounts: {
    id: {
      initialize: (o: {
        client_id: string;
        callback: (r: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
        ux_mode?: "popup" | "redirect";
      }) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
      disableAutoSelect: () => void;
    };
    oauth2: {
      initTokenClient: (o: {
        client_id: string;
        scope: string;
        callback: (r: GoogleTokenResponse) => void;
        error_callback?: (e: { type: string }) => void;
      }) => { requestAccessToken: (o?: { prompt?: string }) => void };
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

let loader: Promise<GoogleIdentityApi> | null = null;

/** Loads Google Identity Services once; rejects (and allows a retry) if the script fails. */
export function loadGoogleIdentity(): Promise<GoogleIdentityApi> {
  if (loader) return loader;
  loader = new Promise<GoogleIdentityApi>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google);
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => (window.google?.accounts ? resolve(window.google) : reject(new Error("GIS")));
    s.onerror = () => reject(new Error("Không tải được dịch vụ đăng nhập Google."));
    document.head.appendChild(s);
  }).catch((e) => {
    loader = null;
    throw e;
  });
  return loader;
}
