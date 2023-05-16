import { ReactiveController, ReactiveControllerHost } from "lit";

export interface FormField {
  /** A function that returns the form control's name, which will be submitted with the form data. */
  name: string;
  /** A function that returns the form control's current value. */
  value: any;

  /** A function that returns the form control's current disabled state. If disabled, the value won't be submitted. */
  disabled: boolean;
  /**
   * A function that maps to the form control's reportValidity() function. When the control is invalid, this will
   * prevent submission and trigger the browser's constraint violation warning.
   */
  reportValidity?: () => boolean;
  // Reset the value of the form field to its initial state
  reset?: () => void;
}

export class FormFieldController implements ReactiveController {
  form?: HTMLFormElement;

  constructor(protected host: ReactiveControllerHost & Element & FormField) {
    this.host.addController(this);
    this.handleFormData = this.handleFormData.bind(this);
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
    this.handleFormReset = this.handleFormReset.bind(this);
  }

  closestElement(selector: string) {
    function __closestFrom(el: any): any {
      if (!el || el === document || el === window) return null;
      if (el.assignedSlot) el = el.assignedSlot;
      const found = el.closest(selector);
      return found ? found : __closestFrom(el.getRootNode().host);
    }
    return __closestFrom(this.host);
  }

  hostConnected() {
    this.form = this.closestElement("form");

    if (this.form) {
      this.form.addEventListener("formdata", this.handleFormData);
      this.form.addEventListener("submit", this.handleFormSubmit);
      this.form.addEventListener("reset", this.handleFormReset);
      this.form.dispatchEvent(new CustomEvent("update-form"));
    }
  }

  hostDisconnected() {
    if (this.form) {
      this.form.removeEventListener("formdata", this.handleFormData);
      this.form.removeEventListener("submit", this.handleFormSubmit);
      this.form.removeEventListener("reset", this.handleFormReset);
      this.form = undefined;
    }
  }

  handleFormData(event: FormDataEvent) {
    const disabled = this.host.disabled;
    const name = this.host.name;
    const value = this.host.value;

    if (!disabled && name && value !== undefined) {
      if (Array.isArray(value)) {
        value.map((val) => event.formData.append(name, val));
      } else {
        event.formData.append(name, value);
      }
    }
  }

  handleFormSubmit(event: Event) {
    const form = this.form;
    const disabled = this.host.disabled;
    const reportValidity = this.host.reportValidity;

    if (
      form &&
      !form.noValidate &&
      !disabled &&
      reportValidity &&
      !this.host.reportValidity()
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  handleFormReset(_event: Event) {
    this.host.reset!();
  }
}
