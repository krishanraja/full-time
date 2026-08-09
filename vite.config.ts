// @lovable.dev/vite-tanstack-config already includes the following. Do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { workflow } from "workflow/vite";

const workflowPlugins = workflow({ dirs: ["src/workflows"], runtime: "nodejs24.x" }).map(
  (plugin) => ({ ...plugin, enforce: "pre" as const }),
);

export default defineConfig({
  // Lovable appends custom plugins after its internal TanStack/Nitro plugins.
  // Workflow directives must transform first, so mark the three plugins pre.
  plugins: workflowPlugins,
  vite: {
    // The package is optional because it has no Windows ARM64 binary. Keep it
    // external so Linux production installs can supply it while unsupported
    // runtimes fail closed through FFMPEG_PATH validation.
    ssr: { external: ["ffmpeg-static"] },
    build: { rolldownOptions: { external: ["ffmpeg-static"] } },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Force-enable the Nitro deploy build outside the Lovable environment and target Vercel,
  // otherwise the wrapper skips the server bundle and the deployment 404s on SSR routes.
  nitro: { preset: "vercel" },
});
