import path from "node:path";
import { existsSync } from "node:fs";

// Standalone Vite config: every plugin is imported directly from its package,
// so the build no longer depends on any @lovable.dev/* helper.
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";

// Load all env vars into process.env for server routes only (VITE_* client
// injection is handled by the `define` block below — do not add those there,
// or secrets would leak into the client bundle).
const serverEnv = loadEnv(process.env["NODE_ENV"] ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

/**
 * Pin `entities` to the copy installed at the project root so SSR never pulls a second,
 * nested copy. Layout differs by version (v4: lib/esm, v6: dist/esm) and package managers
 * that do not hoist may not expose it at the root at all — in that case we alias nothing and
 * let normal resolution handle it.
 */
const entitiesEsmDir = ["dist/esm", "lib/esm"]
  .map((dir) => path.resolve(process.cwd(), "node_modules/entities", dir))
  .find((dir) => existsSync(path.join(dir, "decode.js")));
const entitiesAlias = entitiesEsmDir
  ? {
      "entities/lib/decode.js": path.join(entitiesEsmDir, "decode.js"),
      "entities/lib/decode": path.join(entitiesEsmDir, "decode.js"),
      "entities/lib/encode.js": path.join(entitiesEsmDir, "escape.js"),
      "entities/lib/escape.js": path.join(entitiesEsmDir, "escape.js"),
      "entities/decode": path.join(entitiesEsmDir, "decode.js"),
      "entities/escape": path.join(entitiesEsmDir, "escape.js"),
      entities: path.join(entitiesEsmDir, "index.js"),
    }
  : {};

export default defineConfig(({ command, mode }) => {
  // Mirror VITE_* vars onto import.meta.env.* so the client bundle gets them.
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), "VITE_"))) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const plugins = [
    tailwindcss(),
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
      tsconfigPaths: true,
      alias: {
        ...entitiesAlias,
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
      watch: {
        // Thư mục output không phải source. Nếu Vite watch chúng, mỗi lần
        // `bun run build` xoá/tạo lại thư mục sẽ làm FSWatcher chết với
        // "UNKNOWN: unknown error, scandir '...\.output'".
        ignored: ["**/.output/**", "**/.nitro/**", "**/.wrangler/**", "**/dist/**"],
      },
    },
    plugins,
  };
});
