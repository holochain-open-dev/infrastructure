import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "dist/index.js",
  output: {
    format: "es",
    dir: "./dist-rollup",
  },
  external: [],

  plugins: [
    /** Resolve bare module imports */
    nodeResolve({
      browser: true,
    }),
    commonjs(),
  ],
};
