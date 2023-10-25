import { defineConfig } from "vite";
import { vitePlugins } from "@mythosthesia/reveal-course-preset/vite-plugins.js";

export default defineConfig({
  optimizeDeps: {
    disabled: true,
  },
  base: "/common/stores",
  plugins: vitePlugins,
  build: {
    outDir: "../dist/stores",
  },
});
