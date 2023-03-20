import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { msg } from "@lit/localize";
import "@shoelace-style/shoelace/dist/components/avatar/avatar.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import { mdiPlus } from "@mdi/js";

import { FormFieldController } from "../form-field-controller.js";
import { resizeAndExport } from "../image.js";
import { wrapPathInSvg } from "../icon.js";
import { sharedStyles } from "../shared-styles.js";

@customElement("select-avatar")
export class SelectAvatar extends LitElement {
  @property({ attribute: "name" })
  name: string = "avatar";

  @property()
  required: boolean = false;

  @property()
  shape: "circle" | "square" | "rounded" = "circle";

  @state()
  private _avatar: string | undefined;

  @query("#avatar-file-picker")
  private _avatarFilePicker!: HTMLInputElement;

  @query("#error-input")
  private _errorInput!: HTMLInputElement;

  _controller = new FormFieldController(this, {
    name: () => this.name,
    value: () => this._avatar,
    reportValidity: () => {
      const invalid = this.required && !this._avatar;
      if (invalid) {
        this._errorInput.setCustomValidity("Avatar is required");
        this._errorInput.reportValidity();
      }

      return !invalid;
    },
  });

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
        <div
          class="column"
          style="align-items: center; height: 50px"
          @click=${() => {
            this._avatar = undefined;
          }}
        >
          <sl-tooltip .content=${msg("Clear")}>
            <sl-avatar
              image="${this._avatar}"
              alt="Avatar"
              .shape=${this.shape}
              initials=""
            ></sl-avatar
          ></sl-tooltip>
        </div>
      `;
    else
      return html` <div class="column" style="align-items: center;">
        <sl-button
          variant="default"
          size="large"
          circle
          @click=${() => this._avatarFilePicker.click()}
        >
          <sl-icon
            src="${wrapPathInSvg(mdiPlus)}"
            .label=${msg("Add avatar image")}
          ></sl-icon>
        </sl-button>
      </div>`;
  }

  render() {
    return html`<input
        type="file"
        id="avatar-file-picker"
        style="display: none"
        @change=${this.onAvatarUploaded}
      />
      <div class="column" style="position: relative; align-items: center">
        <input
          id="error-input"
          style="position: absolute; z-index: -1; left: 50%; top: 30px; height: 0; width: 0"
        />
        <span
          style="font-size: var(--sl-input-label-font-size-medium); margin-bottom: 4px"
          >${msg("Avatar")}${this.required ? " *" : ""}</span
        >
        ${this.renderAvatar()}
      </div>`;
  }

  static styles = sharedStyles;
}
