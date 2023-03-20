import { ReactiveController, ReactiveControllerHost } from "lit";

export interface FormFieldControllerOptions {
  /** A function that returns the form control's name, which will be submitted with the form data. */
  name: () => string;
  /** A function that returns the form control's current value. */
  value: () => any;

  /** A function that returns the form containing the form control. */
  form?: () => HTMLFormElement;
  /** A function that returns the form control's current disabled state. If disabled, the value won't be submitted. */
  disabled?: () => boolean;
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

  options: FormFieldControllerOptions;

  constructor(
    protected host: ReactiveControllerHost & Element,
    options: FormFieldControllerOptions
  ) {
    this.host.addController(this);
    this.options = {
      ...{
        form: () => this.host.closest("form"),
        disabled: () => false,
        reportValidity: () => true,
        reset: () => {},
      },
      ...options,
    };
    this.handleFormData = this.handleFormData.bind(this);
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
    this.handleFormReset = this.handleFormReset.bind(this);
  }

  hostConnected() {
    this.form = this.options.form!();

    if (this.form) {
      this.form.addEventListener("formdata", this.handleFormData);
      this.form.addEventListener("submit", this.handleFormSubmit);
      this.form.addEventListener("reset", this.handleFormReset);
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
    const disabled = this.options.disabled!();
    const name = this.options.name();
    const value = this.options.value();

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
    const disabled = this.options.disabled!();
    const reportValidity = this.options.reportValidity;

    if (
      form &&
      !form.noValidate &&
      !disabled &&
      reportValidity &&
      !reportValidity()
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  handleFormReset(_event: Event) {
    this.options.reset!();
  }
}
