import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { css, html, LitElement } from "lit";
import { property, query } from "lit/decorators.js";
import { IconButton } from "@scoped-elements/material-web";
import { Snackbar } from "@scoped-elements/material-web";
import { serializeHash } from "@holochain-open-dev/utils";
import { HoloHash } from "@holochain/client";
import { hashProperty } from "./holo-hash-property";

export class CopiableHash extends ScopedElementsMixin(LitElement) {
  @property(hashProperty('hash'))
  hash!: HoloHash;

  @property({ type: Number })
  sliceLength: number = 8;

  @query("#copy-notification")
  _copyNotification: Snackbar;

  get strHash() {
    return serializeHash(this.hash);
  }

  async copyHash() {
    await navigator.clipboard.writeText(this.strHash);
    this._copyNotification.show();
  }

  render() {
    return html`
      <mwc-snackbar
        id="copy-notification"
        labelText="Hash copied to clipboard"
      ></mwc-snackbar>
      <div class="row center-content">
        <span style="font-family: monospace;"
          >${this.strHash.substring(0, this.sliceLength)}...</span
        >
        <mwc-icon-button
          style="--mdc-icon-button-size	: 24px; --mdc-icon-size: 20px;"
          icon="content_copy"
          @click=${() => this.copyHash()}
        ></mwc-icon-button>
      </div>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        flex: 1;
      }
      .row {
        display: flex;
        flex-direction: row;
      }
      .column {
        display: flex;
        flex-direction: column;
      }
      .fill {
        height: 100%;
        flex: 1;
      }
      .center-content {
        align-items: center;
        justify-content: center;
        display: flex;
      }
    `;
  }

  static get scopedElements() {
    return {
      "mwc-icon-button": IconButton,
      "mwc-snackbar": Snackbar,
    };
  }
}
