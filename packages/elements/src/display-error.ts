import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { Icon } from "@scoped-elements/material-web";
import { SlTooltip } from "@scoped-elements/shoelace";
import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { sharedStyles } from "./shared-styles";

export class DisplayError extends ScopedElementsMixin(LitElement) {
  @property({ attribute: "tooltip" })
  tooltip: boolean = false;

  @property()
  error!: string;

  @property({ attribute: "icon-size" })
  iconSize: string | undefined;

  get _iconSize() {
    if (this.iconSize) return this.iconSize;
    if (this.tooltip !== false) return "32px";
    return "64px";
  }

  renderIcon() {
    return html`
      <mwc-icon
        style="color: red; --mdc-icon-size: ${this._iconSize}; height: ${this
          ._iconSize}; width: ${this._iconSize}; margin-bottom: 8px;"
        >error_outlined</mwc-icon
      >
    `;
  }

  renderFull() {
    return html` <div class="column center-content" style="flex: 1">
      ${this.renderIcon()}
      <span style="width: 500px; text-align: center" class="placeholder"
        >${this.error}
      </span>
    </div>`;
  }

  renderTooltip() {
    return html`
      <sl-tooltip hoist .content=${this.error}>
        ${this.renderIcon()}</sl-tooltip
      >
    `;
  }

  render() {
    if (this.tooltip !== false) return this.renderTooltip();
    return this.renderFull();
  }

  static styles = [sharedStyles];

  static get scopedElements() {
    return {
      "mwc-icon": Icon,
      "sl-tooltip": SlTooltip,
    };
  }
}
