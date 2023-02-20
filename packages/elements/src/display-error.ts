import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { MdIcon } from "@scoped-elements/material-web";
import { SlTooltip } from "@scoped-elements/shoelace";
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { sharedStyles } from "./shared-styles.js";

export class DisplayError extends ScopedElementsMixin(LitElement) {
  @property({ attribute: "tooltip" })
  tooltip: boolean = false;

  @property()
  headline: string | undefined;

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
      <md-icon
        style="color: red; --md-icon-size: ${this._iconSize}; height: ${this
          ._iconSize}; width: ${this._iconSize}; margin-bottom: 8px;"
        >error_outlined</md-icon
      >
    `;
  }

  renderFull() {
    return html` <div class="column center-content" style="flex: 1">
      ${this.renderIcon()}
      <div style="width: 500px; text-align: center" class="column">
        ${this.headline
          ? html` <span style="margin-bottom: 8px">${this.headline} </span>`
          : html``}
        <span class="placeholder">${this.error} </span>
      </div>
    </div>`;
  }

  renderTooltip() {
    return html`
      <sl-tooltip hoist .content=${this.headline ? this.headline : this.error}>
        ${this.renderIcon()}</sl-tooltip
      >
    `;
  }

  render() {
    if (this.tooltip !== false) return this.renderTooltip();
    return this.renderFull();
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex: 1;
      }
    `,
  ];

  static get scopedElements() {
    return {
      "md-icon": MdIcon,
      "sl-tooltip": SlTooltip,
    };
  }
}
