import { defineConfig } from "vite";

export default defineConfig({
  server: {
    open: true,
    strictPort: false,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    // Modular p5 (core + webgl) still minifies to ~630 kB; that is expected.
    chunkSizeWarningLimit: 700,
  },
});
