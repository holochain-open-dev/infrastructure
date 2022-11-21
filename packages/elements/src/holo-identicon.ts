import { css, html, LitElement, PropertyValues } from "lit";
import { property, query, state } from "lit/decorators.js";
import renderIcon from "@holo-host/identicon";
import { classMap } from "lit/directives/class-map.js";
import { deserializeHash, serializeHash } from "@holochain-open-dev/utils";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { SlTooltip } from "@scoped-elements/shoelace";
import { HoloHash } from "@holochain/client";
import isEqual from "lodash-es/isEqual";
import { hashProperty } from "./holo-hash-property";

export class HoloIdenticon extends ScopedElementsMixin(LitElement) {
  @property(hashProperty('hash'))
  hash!: HoloHash;

  /**
   * Size of the identicon in pixels.
   */
  @property({ type: Number })
  size = 32;

  /**
   * Shape of the identicon.
   */
  @property({ type: String })
  shape: "square" | "circle" = "circle";

  @query("#canvas")
  private _canvas!: HTMLCanvasElement;

  @query("#tooltip")
  private _tooltip!: SlTooltip;

  @state()
  justCopiedHash = false;

  timeout: any;

  async copyHash() {
    await navigator.clipboard.writeText(this.strHash);

    if (this.timeout) clearTimeout(this.timeout);

    this.justCopiedHash = true;
    this._tooltip.show();

    this.timeout = setTimeout(() => {
      this._tooltip.hide();
      setTimeout(() => {
        this.justCopiedHash = false;
      }, 100);
    }, 2000);
  }

  get strHash() {
    return serializeHash(this.hash);
  }

  updated(changedValues: PropertyValues) {
    super.updated(changedValues);

    if (
      (changedValues.has("hash") &&
        !isEqual(changedValues.get("hash"), this.hash)) ||
      changedValues.has("size") ||
      changedValues.has("value")
    ) {
      renderIcon(
        {
          hash: this.hash,
          size: this.size,
        },
        this._canvas
      );
    }
  }

  renderCanvas() {
    return html` <canvas
      id="canvas"
      width="1"
      height="1"
      class=${classMap({
      square: this.shape === "square",
      circle: this.shape === "circle",
    })}
    ></canvas>`;
  }

  render() {
    return html`<div
      @click=${() => this.copyHash()}
      style="cursor: pointer; flex-grow: 0"
    >
      <sl-tooltip
        id="tooltip"
        placement="top"
        .content=${this.justCopiedHash
        ? "Copied!"
        : `${this.strHash.substring(0, 6)}...`}
        .trigger=${this.justCopiedHash ? "manual" : "hover focus"}
        hoist
      >
        ${this.renderCanvas()}
      </sl-tooltip>
    </div>`;
  }

  static get scopedElements() {
    return {
      "sl-tooltip": SlTooltip,
    };
  }

  static get styles() {
    return css`
      :host {
        display: flex;
      }

      .square {
        border-radius: 0%;
      }
      .circle {
        border-radius: 50%;
      }
    `;
  }
}
