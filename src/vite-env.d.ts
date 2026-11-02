/// <reference types="vite/client" />

/**
 * Typed access to the public (browser) environment variables.
 * Declaring them explicitly lets us use dotted access (`import.meta.env.VITE_*`),
 * which is the only form Vite's `define` replaces at build time.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
