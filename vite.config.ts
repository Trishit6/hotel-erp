import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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
        target: process.env.API_PROXY_TARGET ?? "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
