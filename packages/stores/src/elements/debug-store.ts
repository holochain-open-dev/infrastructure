import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Readable, get } from "svelte/store";

import { Derived } from "../derived.js";

@customElement("debug-store")
export class DebugStore extends LitElement {
  @property()
  store: Readable<any>;

  renderStore(s: Readable<any>) {
    const derivedStores = (s as Derived<any>).derivedFrom || [];
    return html`
      <div class="column">
        ${derivedStores.map((s) => this.renderStore(s))}
        <span> ${JSON.stringify(get(s))} </span>
      </div>
    `;
  }

  render() {
    return this.renderStore(this.store);
  }

  static styles = css`
    .column {
      display: flex;
      flex-direction: column;
    }

    .row {
      display: flex;
      flex-direction: row;
    }
  `;
}
