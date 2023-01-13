import rcommonjs from "@rollup/plugin-commonjs";
import rreplace from "@rollup/plugin-replace";
import rbuiltins from "rollup-plugin-node-builtins";
import rglobals from "rollup-plugin-node-globals";
import { fromRollup } from "@web/dev-server-rollup";

const replace = fromRollup(rreplace);
const commonjs = fromRollup(rcommonjs);
const builtins = fromRollup(rbuiltins);
const globals = fromRollup(rglobals);

export default {
  nodeResolve: false,
  plugins: [],
  // in a monorepo you need to set set the root dir to resolve modules
  rootDir: "../../",
};
