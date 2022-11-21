import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { Fab } from "@scoped-elements/material-web";
import { SlAvatar } from "@scoped-elements/shoelace";
import { css, html, LitElement } from "lit";
import { property, query, state } from "lit/decorators.js";

import { resizeAndExport } from "./image";

export class SelectAvatar extends ScopedElementsMixin(LitElement) {
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
            style="margin-bottom: 4px; --size: 3.5rem;"
            initials=""
          ></sl-avatar>
          <span
            class="placeholder label"
            style="cursor: pointer;   text-decoration: underline;"
            @click=${() => (this._avatar = undefined)}
            >Clear</span
          >
        </div>
      `;
    else
      return html` <div class="column" style="align-items: center;">
        <mwc-fab
          icon="add"
          @click=${() => this._avatarFilePicker.click()}
          style="margin-bottom: 4px;"
        ></mwc-fab>
        <span class="placeholder label">Avatar</span>
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
      color: var(--mdc-text-field-label-ink-color, rgba(0, 0, 0, 0.6));
      font-family: var(
        --mdc-typography-caption-font-family,
        var(--mdc-typography-font-family, Roboto, sans-serif)
      );
      font-size: var(--mdc-typography-caption-font-size, 0.79rem);
      font-weight: var(--mdc-typography-caption-font-weight, 400);
    }

    .column {
      display: flex;
      flex-direction: column;
    }
  `;

  static get scopedElements() {
    return {
      "mwc-fab": Fab,
      "sl-avatar": SlAvatar,
    };
  }
}
