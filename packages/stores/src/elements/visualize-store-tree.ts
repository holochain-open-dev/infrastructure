import { css, html, LitElement } from "lit";
import { StoreSubscriber } from "lit-svelte-stores";
import { customElement, property, state } from "lit/decorators.js";
import { derived, Readable } from "svelte/store";
import "@alenaksu/json-viewer";
import cloneDeepWith from "lodash-es/cloneDeepWith.js";
import "@scoped-elements/cytoscape";
import { EdgeDefinition, NodeDefinition } from "cytoscape";
import { encodeHashToBase64 } from "@holochain/client";
import "@shoelace-style/shoelace/dist/components/relative-time/relative-time.js";

import { Derived } from "../derived.js";
import { deriveStore } from "../async-derived.js";

type TreeNode<T> = {
  node: T;
  children: Array<TreeNode<T>>;
};

let count: number = 1;
const idMap: WeakMap<Record<string, unknown> | Array<unknown>, number> =
  new WeakMap<Record<string, unknown> | Array<unknown>, number>();
function getObjectId(object: any): number {
  const objectId: number | undefined = idMap.get(object);
  if (objectId === undefined) {
    count += 1;
    idMap.set(object, count);

    return count;
  }

  return objectId;
}

export function buildAndJoinTree(
  store: Readable<any>
): Readable<TreeNode<{ id: number; value: any; lastUpdated: number }>> {
  return deriveStore(store, (value) => {
    const deps = (store as Derived<any>).derivedFrom || [];
    const childStores = deps.map((c) => buildAndJoinTree(c));
    return derived(childStores, (children) => ({
      node: {
        id: getObjectId(store),
        value,
        lastUpdated: Date.now(),
      },
      children,
    }));
  });
}

export function valueTreeToElements(
  valueTree: TreeNode<{ id: number; value: any }>
): Array<NodeDefinition | EdgeDefinition> {
  const nestedChildElements = valueTree.children.map((child) =>
    valueTreeToElements(child)
  );
  const elements = ([] as Array<NodeDefinition | EdgeDefinition>).concat(
    ...nestedChildElements
  );
  for (const child of valueTree.children) {
    elements.push({
      data: {
        id: `${valueTree.node.id}->${child.node.id}`,
        source: valueTree.node.id.toString(),
        target: child.node.id.toString(),
      },
    });
  }

  let label = JSON.stringify(valueTree.node.value);
  let classes = [];
  if ("status" in valueTree.node.value) {
    classes = [valueTree.node.value.status];
    // This is an async readable
    if (valueTree.node.value.status === "pending") {
      label = "Pending";
    } else if (valueTree.node.value.status === "complete") {
      label = valueTree.node.value.value;
    } else {
      label = valueTree.node.value.error.message;
    }
  }
  elements.push(
    {
      data: {
        id: valueTree.node.id.toString(),
      },
      classes,
    },
    {
      data: {
        id: `${valueTree.node.id.toString()}-content`,
        parent: valueTree.node.id.toString(),
        label: label.toString().slice(0, 20),
      },
    }
  );

  return elements;
}

export function findNodeInTree(
  tree: TreeNode<{ id: number; value: any; lastUpdated: number }>,
  id: number
): { id: number; value: any; lastUpdated: number } {
  if (tree.node.id === id) return tree.node;
  for (const c of tree.children) {
    const value = findNodeInTree(c, id);
    if (value) {
      return value;
    }
  }

  return undefined;
}

@customElement("visualize-store-tree")
export class VisualizeStoreTree extends LitElement {
  @property()
  store!: Readable<any>;

  @state()
  selectedStore: number | undefined;

  _subscriber = new StoreSubscriber(
    this,
    () => buildAndJoinTree(this.store),
    () => [this.store]
  );

  get selectedValue() {
    return cloneDeepWith(
      findNodeInTree(this._subscriber.value, this.selectedStore).value,
      (value) => {
        if (value instanceof Map) {
          return cloneDeepWith(Object.fromEntries(value), (value) => {
            if (value instanceof Uint8Array) {
              return encodeHashToBase64(value);
            }
            return undefined;
          });
        } else if (value instanceof Uint8Array) {
          return encodeHashToBase64(value);
        }
        return undefined;
      }
    );
  }

  render() {
    return html`
      <div class="row" style="flex: 1; gap: 16px">
        <cytoscape-klay
          .elements=${valueTreeToElements(this._subscriber.value)}
          .klayOptions=${{
            klay: {
              direction: "LEFT",
            },
          }}
          @node-selected=${(e) => {
            this.selectedStore = parseInt(e.detail.id(), 10);
          }}
          .options=${{
            boxSelectionEnabled: true,
            userZoomingEnabled: false,
            userPanningEnabled: false,

            style: `
node[label] {
  font-size: 6px;
  width: 10px;
  label: data(label);
  height: 10px;
}
        node {
          max-width: 100px;
        }
        :selected {
          border-color: black;
        }
        
node > node {
  height: 1px;
        width: 1px;
}
        edge {
            width: 2;
  target-arrow-shape: triangle;
  curve-style: bezier;

        }
        .pending {
          background-color: lightblue;
        }
        .complete {
          background-color: rgba(0,255,0,0.6);
        }
        .error {
          background-color: rgba(255,0,0,0.6);
        }
        `,
          }}
          style="flex: 1"
        ></cytoscape-klay>
        <div class="row" style="flex-basis: 300px">
          ${this.selectedStore
            ? html`
                <div
                  style="display: flex; flex-direction: column; flex: 1; gap: 16px"
                >
                  <json-viewer
                    style="flex: 1"
                    .data=${this.selectedValue}
                  ></json-viewer>
                  <div style="display: flex; flex-direction: row;">
                    <span>Last updated: </span>
                    <sl-relative-time
                      .date=${new Date(
                        findNodeInTree(
                          this._subscriber.value,
                          this.selectedStore
                        ).lastUpdated
                      )}
                    ></sl-relative-time>
                  </div>
                </div>
              `
            : html`
                <span style="align-self: center"
                  >Select a store to inspect its result</span
                >
              `}
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      min-height: 250px;
      min-width: 500px;
    }
    .row {
      display: flex;
      flex-direction: row;
    }
  `;
}
