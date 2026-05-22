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
  },
});
