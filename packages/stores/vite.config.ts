// vite.config.js
import checker from "vite-plugin-checker";
import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    disabled: true,
  },

  root: "./demo",
  plugins: [checker({ typescript: true })], // e.g. use TypeScript check
});
