import { Readable, get } from "svelte/store";
import logtree from "console-log-tree";
import { Derived } from "./derived.js";

type TreeNode = {
  name: string;
  children?: Array<TreeNode>;
};

export function buildTree(store: Readable<any>): TreeNode {
  const value = JSON.stringify(get(store));

  const deps = (store as Derived<any>).derivedFrom || [];

  const children = deps.map((s) => buildTree(s));

  return {
    name: value,
    children,
  };
}

export function debugStore(store: Readable<any>) {
  console.log(logtree.parse(buildTree(store)));
  setInterval(() => {
    console.log(logtree.parse(buildTree(store)));
  }, 1000);
}

if (typeof window === "object") {
  (window as any).__debugStore = debugStore;
}
