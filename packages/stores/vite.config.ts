// vite.config.js
import checker from "vite-plugin-checker";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [checker({ typescript: true })], // e.g. use TypeScript check
  build: {
    target: "es2020",
    lib: {
      formats: ["es"],
      entry: "src/index.ts",
      name: "index",
    },
    minify: false,
  },
});
