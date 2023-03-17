import { css, html, LitElement } from "lit";
import { property, query, state } from "lit/decorators.js";
import "@shoelace-style/shoelace/dist/components/avatar/avatar.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
// @ts-ignore
import svg from "bootstrap-icons/icons/plus.svg";
import { msg } from "@lit/localize";

import { resizeAndExport } from "./image.js";

export class SelectAvatar extends LitElement {
  @property()
  shape: "circle" | "square" | "rounded" = "circle";

  @state()
  private _avatar: string | undefined;

  @query("#avatar-file-picker")
  private _avatarFilePicker!: HTMLInputElement;

  onAvatarUploaded() {
    if (this._avatarFilePicker.files && this._avatarFilePicker.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          this._avatar = resizeAndExport(img);
          this._avatarFilePicker.value = "";
        };
        img.src = e.target?.result as string;

        this.dispatchEvent(
          new CustomEvent("avatar-selected", {
            composed: true,
            bubbles: true,
            detail: {
              avatar: img.src,
            },
          })
        );
      };
      reader.readAsDataURL(this._avatarFilePicker.files[0]);
    }
  }

  clear() {
    this._avatar = undefined;
  }

  renderAvatar() {
    if (this._avatar)
      return html`
        <div class="column" style="align-items: center; ">
          <sl-avatar
            image="${this._avatar}"
            alt="Avatar"
            .shape=${this.shape}
            style="margin-bottom: 4px; --size: 3.125rem;"
            initials=""
          ></sl-avatar>
          <span
            class="placeholder label"
            style="cursor: pointer; text-decoration: underline;"
            @click=${() => {
              this._avatar = undefined;
            }}
            >${msg("Clear")}</span
          >
        </div>
      `;
    else
      return html` <div class="column" style="align-items: center;">
        <sl-button
          variant="default"
          size="large"
          circle
          @click=${() => this._avatarFilePicker.click()}
          style="margin-bottom: 4px;"
        >
          <sl-icon .src=${svg} .label=${msg("Add avatar image")}></sl-icon>
        </sl-button>

        <span class="placeholder label">${msg("Avatar")}</span>
      </div>`;
  }

  render() {
    return html`<input
        type="file"
        id="avatar-file-picker"
        style="display: none;"
        @change=${this.onAvatarUploaded}
      />
      <div style="width: 80px; height: 80px;">${this.renderAvatar()}</div>`;
  }

  static styles = css`
    .placeholder {
      color: rgba(0, 0, 0, 0.7);
    }
    .label {
      color: rgba(0, 0, 0, 0.6);
      font-size: 0.79rem;
      font-weight: 400;
    }

    .column {
      display: flex;
      flex-direction: column;
    }
  `;
}
