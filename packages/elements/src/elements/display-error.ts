import { css, html, LitElement } from "lit";
import { property, customElement } from "lit/decorators.js";
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import { mdiAlertCircleOutline } from "@mdi/js";

import { sharedStyles } from "../shared-styles.js";
import { wrapPathInSvg } from "../icon.js";

@customElement("display-error")
export class DisplayError extends LitElement {
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
      <sl-icon
        style="color: red; height: ${this._iconSize}; width: ${this
          ._iconSize}; margin-bottom: 8px;"
        src="${wrapPathInSvg(mdiAlertCircleOutline)}"
      ></sl-icon>
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
}
