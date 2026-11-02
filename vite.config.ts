import path from "node:path";

// Standalone Vite config: every plugin is imported directly from its package,
// so the build no longer depends on any @lovable.dev/* helper.
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Load all env vars into process.env for server routes only (VITE_* client
// injection is handled by the `define` block below — do not add those there,
// or secrets would leak into the client bundle).
const serverEnv = loadEnv(process.env["NODE_ENV"] ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

export default defineConfig(({ command, mode }) => {
  // Mirror VITE_* vars onto import.meta.env.* so the client bundle gets them.
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), "VITE_"))) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const plugins = [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
      // Redirect TanStack Start's bundled server entry to src/server.ts (our
      // SSR error wrapper). nitro/vite builds from this.
      server: { entry: "server" },
    }),
    viteReact(),
  ];

  // Deploy plugin: build only. `defaultPreset` keeps Cloudflare Workers as the
  // fallback target while still honouring an explicit NITRO_PRESET override.
  if (command === "build") {
    plugins.push(nitro({ defaultPreset: "cloudflare-module" }));
  }

  return {
    define: envDefine,
    ...(command === "build" && mode === "development"
      ? {
          environments: {
            client: { define: { "process.env.NODE_ENV": JSON.stringify("development") } },
          },
          esbuild: { keepNames: true },
        }
      : {}),
    css: { transformer: "lightningcss" as const },
    resolve: {
      alias: {
        // Pin entities to the hoisted v4.5.0 copy; nested v7 copies break SSR.
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(__dirname, "node_modules/entities"),
        "@": path.resolve(__dirname, "src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: {
      host: "::",
      port: 8080,
    },
    plugins,
  };
});
