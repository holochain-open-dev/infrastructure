import { defineConfig } from "vite";
import { vitePlugins } from "@mythosthesia/reveal-course-preset/vite-plugins.js";

export default defineConfig({
  optimizeDeps: {
    noDiscovery: true,
    include: undefined,
  },
  base: "/common/stores",
  plugins: vitePlugins,
  build: {
    outDir: "../dist/stores",
  },
});
