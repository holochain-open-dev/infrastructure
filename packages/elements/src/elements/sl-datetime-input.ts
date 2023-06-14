import { localized } from "@lit/localize";
import { SlInput } from "@shoelace-style/shoelace";
import { html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";

import { FormField, FormFieldController } from "../form-field-controller.js";
import { sharedStyles } from "../shared-styles.js";
import { formatDateForInput } from "../date-utils.js";

@localized()
@customElement("sl-datetime-input")
export class SlDatetimeInput extends LitElement implements FormField {
  @property()
  label: string | undefined;

  @property()
  name: string | undefined;

  @property()
  defaultValue: Date | number | string | undefined;

  @property({ type: Boolean, attribute: "required" })
  required = false;

  @property({ type: Boolean, attribute: "disabled" })
  disabled = false;

  @property()
  min: Date | number | string | undefined;

  @property()
  max: Date | number | string | undefined;

  @query("#date")
  dateField!: SlInput;

  @query("#time")
  timeField!: SlInput;

  _controller = new FormFieldController(this);

  toDate(d: Date | string | number) {
    if (typeof d === "string" || typeof d === "number") return new Date(d);
    return d;
  }

  reportValidity() {
    if (this.disabled) return true;

    const value = this.value;
    if (!value && this.required) {
      const field = this.dateField.value ? this.timeField : this.dateField;

      field.setCustomValidity("Date and time are required");
      field.reportValidity();
      return false;
    }

    if (this.min) {
      if (this.toDate(this.min).valueOf() > new Date(value).valueOf()) {
        this.dateField.setCustomValidity(
          `Min. date is ${this.toDate(this.min).toLocaleString()}`
        );
        this.dateField.reportValidity();
        return false;
      }
    }

    if (this.max) {
      if (this.toDate(this.max).valueOf() < new Date(value).valueOf()) {
        this.dateField.setCustomValidity(
          `Max. date is ${this.toDate(this.max).toLocaleString()}`
        );
        this.dateField.reportValidity();
        return false;
      }
    }

    return true;
  }

  firstUpdated() {
    this.reset();
  }

  reset() {
    setTimeout(() => {
      this.dateField.value = this.defaultValue
        ? formatDateForInput(this.toDate(this.defaultValue)).slice(0, 10)
        : "";
      this.timeField.value = this.defaultValue
        ? formatDateForInput(this.toDate(this.defaultValue)).slice(11, 17)
        : "";
    });
  }

  get value(): string | undefined {
    const dateValue = this.dateField.value;
    const timeValue = this.timeField.value;

    if (!dateValue || !timeValue) return "";

    const date = new Date(`${dateValue}T${timeValue}`);

    return date.toISOString();
  }

  render() {
    return html`
      <div class="row" style="align-items: end">
        <sl-input
          id="date"
          type="date"
          .label=${this.required ? `${this.label}*` : this.label}
          .disabled=${this.disabled}
          style="margin-right: 16px;"
        ></sl-input>

        <sl-input id="time" type="time" .disabled=${this.disabled}></sl-input>
      </div>
    `;
  }

  static styles = sharedStyles;
}
