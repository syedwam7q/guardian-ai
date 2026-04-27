import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: { port: 3000, host: true },
  build: {
    rollupOptions: {
      output: {
        // three.js and @react-three/* are intentionally NOT split into named
        // chunks here — keeping them out of manualChunks lets Rollup hoist
        // them into an async-only chunk (only loaded when CausalGraph3D is
        // dynamically imported, i.e. when the user picks 3D mode).
        manualChunks: (id) => {
          if (id.includes("node_modules/three/")) return undefined;
          if (id.includes("node_modules/@react-three/")) return undefined;
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router-dom/") ||
            id.includes("node_modules/react-router/") ||
            id.includes("node_modules/@remix-run/router/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
          if (id.includes("node_modules/recharts/")) return "vendor-charts";
          if (
            id.includes("node_modules/d3-") ||
            id.includes("node_modules/victory-vendor/")
          ) {
            return "vendor-charts";
          }
          if (id.includes("node_modules/reactflow/")) return "vendor-flow";
          if (id.includes("node_modules/@reactflow/")) return "vendor-flow";
          if (id.includes("node_modules/framer-motion/"))
            return "vendor-motion";
          if (
            id.includes("node_modules/@radix-ui/") ||
            id.includes("node_modules/cmdk/") ||
            id.includes("node_modules/lucide-react/")
          ) {
            return "vendor-ui";
          }
          if (
            id.includes("node_modules/@tanstack/react-query/") ||
            id.includes("node_modules/zustand/") ||
            id.includes("node_modules/zod/") ||
            id.includes("node_modules/react-hook-form/") ||
            id.includes("node_modules/@hookform/")
          ) {
            return "vendor-data";
          }
          return undefined;
        },
      },
    },
    // The lazy CausalGraph3D chunk (three.js + @react-three/*) is ~960 kB —
    // it's only fetched when the user opts into the 3D view, so we tolerate
    // it. Every eagerly-loaded chunk is well under 700 kB.
    chunkSizeWarningLimit: 1000,
  },
});
