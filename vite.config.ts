import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // node_modules is committed with pnpm's Windows junctions materialised as real
  // directories, so packages can resolve their own copy of React. Dedupe keeps
  // the renderer and the app on a single React instance.
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        configure(proxy) {
          proxy.on("error", (error) => {
            console.error(
              `[vite] /api proxy could not reach ${apiTarget}: ${error.message}. Start the API with "pnpm dev:api" or run "pnpm dev" to start both.`,
            );
          });
        },
      },
    },
  },
});
