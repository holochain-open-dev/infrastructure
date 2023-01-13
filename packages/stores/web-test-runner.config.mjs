import rcommonjs from "@rollup/plugin-commonjs";
import rbuiltins from "rollup-plugin-node-builtins";
import { fromRollup } from "@web/dev-server-rollup";

const commonjs = fromRollup(rcommonjs);
const builtins = fromRollup(rbuiltins);

export default {
  nodeResolve: {
    browser: true,
    preferBuiltins: false,
    // exportConditions: ["browser", "development"],
  },
  plugins: [builtins(), commonjs()],
  // in a monorepo you need to set set the root dir to resolve modules
  rootDir: "../../",
};
