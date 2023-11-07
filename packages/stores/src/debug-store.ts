import { Readable, get } from "svelte/store";
import { customElement, property } from "lit/decorators.js";
import { render, html, LitElement } from "lit";
import "@shoelace-style/shoelace/dist/components/drawer/drawer.js";
import lighttheme from "@shoelace-style/shoelace/dist/themes/light.styles.js";

import "./elements/visualize-store-tree.js";

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

@customElement("debug-store")
export class DebugStore extends LitElement {
  @property()
  store: Readable<any>;

  render() {
    return html`<sl-drawer
      placement="bottom"
      open
      label="Debug Store"
      contained
    >
      <visualize-store-tree
        style="flex: 1"
        .store=${this.store}
      ></visualize-store-tree>
    </sl-drawer>`;
  }

  static styles = lighttheme;
}

export function debugStore(store: Readable<any>) {
  const div = document.createElement("div");
  render(html`<debug-store .store=${store}></debug-store>`, div);

  document.body.appendChild(div);
}

if (typeof window === "object") {
  (window as any).__debugStore = debugStore;
}
