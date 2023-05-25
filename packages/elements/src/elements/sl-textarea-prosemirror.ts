import { CSSResultGroup, html, LitElement, css } from "lit";
import { localized, msg } from "@lit/localize";
import { customElement, property, query, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { EditorState } from "prosemirror-state";
import { Schema, DOMParser, NodeSpec } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";

import { FormField, FormFieldController } from "../form-field-controller.js";

const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: {
      content: "text*",
      toDOM(node) {
        return ["p", 0];
      },
    },
    text: {},
  },
});

type UpdateHandler = (prev?: unknown, next?: unknown) => void;

type NonUndefined<A> = A extends undefined ? never : A;

type UpdateHandlerFunctionKeys<T extends object> = {
  [K in keyof T]-?: NonUndefined<T[K]> extends UpdateHandler ? K : never;
}[keyof T];

interface WatchOptions {
  /**
   * If true, will only start watching after the initial update/render
   */
  waitUntilFirstUpdate?: boolean;
}

/**
 * Runs when observed properties change, e.g. @property or @state, but before the component updates. To wait for an
 * update to complete after a change occurs, use `await this.updateComplete` in the handler. To start watching after the
 * initial update/render, use `{ waitUntilFirstUpdate: true }` or `this.hasUpdated` in the handler.
 *
 * Usage:
 *
 * @watch('propName')
 * handlePropChange(oldValue, newValue) {
 *   ...
 * }
 */
export function watch(propertyName: string | string[], options?: WatchOptions) {
  const resolvedOptions: Required<WatchOptions> = {
    waitUntilFirstUpdate: false,
    ...options,
  };
  return <ElemClass extends LitElement>(
    proto: ElemClass,
    decoratedFnName: UpdateHandlerFunctionKeys<ElemClass>
  ) => {
    // @ts-expect-error - update is a protected property
    const { update } = proto;
    const watchedProperties = Array.isArray(propertyName)
      ? propertyName
      : [propertyName];

    // @ts-expect-error - update is a protected property
    proto.update = function (
      this: ElemClass,
      changedProps: Map<keyof ElemClass, ElemClass[keyof ElemClass]>
    ) {
      watchedProperties.forEach((property) => {
        const key = property as keyof ElemClass;
        if (changedProps.has(key)) {
          const oldValue = changedProps.get(key);
          const newValue = this[key];

          if (oldValue !== newValue) {
            if (!resolvedOptions.waitUntilFirstUpdate || this.hasUpdated) {
              (this[decoratedFnName] as unknown as UpdateHandler)(
                oldValue,
                newValue
              );
            }
          }
        }
      });

      update.call(this, changedProps);
    };
  };
}

export const styles = css`
  :host {
    box-sizing: border-box;
  }

  :host *,
  :host *::before,
  :host *::after {
    box-sizing: inherit;
  }

  [hidden] {
    display: none !important;
  }

  :host {
    display: block;
  }
  .form-control .form-control__label {
    display: none;
  }

  .form-control .form-control__help-text {
    display: none;
  }

  /* Label */
  .form-control--has-label .form-control__label {
    display: inline-block;
    color: var(--sl-input-label-color);
    margin-bottom: var(--sl-spacing-3x-small);
  }

  .form-control--has-label.form-control--small .form-control__label {
    font-size: var(--sl-input-label-font-size-small);
  }

  .form-control--has-label.form-control--medium .form-control__label {
    font-size: var(--sl-input-label-font-size-medium);
  }

  .form-control--has-label.form-control--large .form-control__label {
    font-size: var(--sl-input-label-font-size-large);
  }

  :host([required]) .form-control--has-label .form-control__label::after {
    content: var(--sl-input-required-content);
    margin-inline-start: var(--sl-input-required-content-offset);
    color: var(--sl-input-required-content-color);
  }

  /* Help text */
  .form-control--has-help-text .form-control__help-text {
    display: block;
    color: var(--sl-input-help-text-color);
    margin-top: var(--sl-spacing-3x-small);
  }

  .form-control--has-help-text.form-control--small .form-control__help-text {
    font-size: var(--sl-input-help-text-font-size-small);
  }

  .form-control--has-help-text.form-control--medium .form-control__help-text {
    font-size: var(--sl-input-help-text-font-size-medium);
  }

  .form-control--has-help-text.form-control--large .form-control__help-text {
    font-size: var(--sl-input-help-text-font-size-large);
  }

  .form-control--has-help-text.form-control--radio-group
    .form-control__help-text {
    margin-top: var(--sl-spacing-2x-small);
  }

  .textarea {
    display: flex;
    align-items: center;
    position: relative;
    width: 100%;
    font-family: var(--sl-input-font-family);
    font-weight: var(--sl-input-font-weight);
    line-height: var(--sl-line-height-normal);
    letter-spacing: var(--sl-input-letter-spacing);
    vertical-align: middle;
    transition: var(--sl-transition-fast) color,
      var(--sl-transition-fast) border, var(--sl-transition-fast) box-shadow,
      var(--sl-transition-fast) background-color;
    cursor: text;
  }

  /* Standard textareas */
  .textarea--standard {
    background-color: var(--sl-input-background-color);
    border: solid var(--sl-input-border-width) var(--sl-input-border-color);
  }

  .textarea--standard:hover:not(.textarea--disabled) {
    background-color: var(--sl-input-background-color-hover);
    border-color: var(--sl-input-border-color-hover);
  }
  .textarea--standard:hover:not(.textarea--disabled) .textarea__control {
    color: var(--sl-input-color-hover);
  }

  .textarea--standard.textarea--focused:not(.textarea--disabled) {
    background-color: var(--sl-input-background-color-focus);
    border-color: var(--sl-input-border-color-focus);
    color: var(--sl-input-color-focus);
    box-shadow: 0 0 0 var(--sl-focus-ring-width)
      var(--sl-input-focus-ring-color);
  }

  .textarea--standard.textarea--focused:not(.textarea--disabled)
    .textarea__control {
    color: var(--sl-input-color-focus);
  }

  .textarea--standard.textarea--disabled {
    background-color: var(--sl-input-background-color-disabled);
    border-color: var(--sl-input-border-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .textarea--standard.textarea--disabled .textarea__control {
    color: var(--sl-input-color-disabled);
  }

  .textarea--standard.textarea--disabled .textarea__control::placeholder {
    color: var(--sl-input-placeholder-color-disabled);
  }

  /* Filled textareas */
  .textarea--filled {
    border: none;
    background-color: var(--sl-input-filled-background-color);
    color: var(--sl-input-color);
  }

  .textarea--filled:hover:not(.textarea--disabled) {
    background-color: var(--sl-input-filled-background-color-hover);
  }

  .textarea--filled.textarea--focused:not(.textarea--disabled) {
    background-color: var(--sl-input-filled-background-color-focus);
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  .textarea--filled.textarea--disabled {
    background-color: var(--sl-input-filled-background-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .textarea__control {
    flex: 1 1 auto;
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    line-height: 1.4;
    color: var(--sl-input-color);
    border: none;
    background: none;
    box-shadow: none;
    cursor: inherit;
    -webkit-appearance: none;
  }

  .textarea__control::-webkit-search-decoration,
  .textarea__control::-webkit-search-cancel-button,
  .textarea__control::-webkit-search-results-button,
  .textarea__control::-webkit-search-results-decoration {
    -webkit-appearance: none;
  }

  .textarea__control::placeholder {
    color: var(--sl-input-placeholder-color);
    user-select: none;
  }

  .textarea__control:focus {
    outline: none;
  }

  /*
   * Size modifiers
   */

  .textarea--small {
    border-radius: var(--sl-input-border-radius-small);
    font-size: var(--sl-input-font-size-small);
  }

  .textarea--small .textarea__control {
    padding: 0.5em var(--sl-input-spacing-small);
  }

  .textarea--medium {
    border-radius: var(--sl-input-border-radius-medium);
    font-size: var(--sl-input-font-size-medium);
  }

  .textarea--medium .textarea__control {
    padding: 0.5em var(--sl-input-spacing-medium);
  }

  .textarea--large {
    border-radius: var(--sl-input-border-radius-large);
    font-size: var(--sl-input-font-size-large);
  }

  .textarea--large .textarea__control {
    padding: 0.5em var(--sl-input-spacing-large);
  }

  /*
   * Resize types
   */

  .textarea--resize-none .textarea__control {
    resize: none;
  }

  .textarea--resize-vertical .textarea__control {
    resize: vertical;
  }

  .textarea--resize-auto .textarea__control {
    height: auto;
    resize: none;
    overflow-y: hidden;
  }

  p {
    margin: 0 !important;
    font-size: var(--sl-input-font-size-medium);
  }
  .textarea__control {
    height: 105px;
    overflow-y: auto;
  }
  .ProseMirror {
    outline: none;
    word-wrap: break-word;
    white-space: pre-wrap;
    white-space: break-spaces;
  }
`;
@localized()
@customElement("sl-textarea-prosemirror")
export class SlTextareaProsemirror extends LitElement implements FormField {
  static styles: CSSResultGroup = styles;

  private readonly formControlController = new FormFieldController(this);
  // private readonly hasSlotController = new HasSlotController(this, 'help-text', 'label');

  private resizeObserver: ResizeObserver;

  @query("#input") input: any;

  @state() private hasFocus = false;

  @property() title = ""; // make reactive to pass through

  /** The name of the textarea, submitted as a name/value pair with form data. */
  @property() name = "";

  get value() {
    if (!this.view?.state) return "";

    const state = this.view.state.doc.content.toJSON();
    return state.map((p) => (p.content ? p.content[0].text : "")).join("\n");
  }

  set value(v: string) {
    const paragraphs = v.split("\n").map((t) => ({
      type: "paragraph",
      content: [{ type: "text", text: t }],
    }));
    const state = {
      doc: {
        content: paragraphs,
        type: "doc",
      },
      selection: {
        type: "text",
        anchor: 0,
        head: 0,
      },
    };
    this.view.updateState(
      EditorState.fromJSON(this.editorStateConfig(), state)
    );
  }

  /** The textarea's size. */
  @property({ reflect: true }) size: "small" | "medium" | "large" = "medium";

  /** Draws a filled textarea. */
  @property({ type: Boolean, reflect: true }) filled = false;

  /** The textarea's label. If you need to display HTML, use the `label` slot instead. */
  @property() label = "";

  /** The textarea's help text. If you need to display HTML, use the `help-text` slot instead. */
  @property({ attribute: "help-text" }) helpText = "";

  /** Placeholder text to show as a hint when the input is empty. */
  @property() placeholder = "";

  /** The number of rows to display by default. */
  @property({ type: Number }) rows = 4;

  /** Controls how the textarea can be resized. */
  @property() resize: "none" | "vertical" | "auto" = "vertical";

  /** Disables the textarea. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** Makes the textarea readonly. */
  @property({ type: Boolean, reflect: true }) readonly = false;

  /**
   * By default, form controls are associated with the nearest containing `<form>` element. This attribute allows you
   * to place the form control outside of a form and associate it with the form that has this `id`. The form must be in
   * the same document or shadow root for this to work.
   */
  @property({ reflect: true }) form = "";

  /** Makes the textarea a required field. */
  @property({ type: Boolean, reflect: true }) required = false;

  /** The minimum length of input that will be considered valid. */
  @property({ type: Number }) minlength: number;

  /** The maximum length of input that will be considered valid. */
  @property({ type: Number }) maxlength: number;

  /** Controls whether and how text input is automatically capitalized as it is entered by the user. */
  @property() autocapitalize:
    | "off"
    | "none"
    | "on"
    | "sentences"
    | "words"
    | "characters";

  /** Indicates whether the browser's autocorrect feature is on or off. */
  @property() autocorrect: string;

  /**
   * Specifies what permission the browser has to provide assistance in filling out form field values. Refer to
   * [this page on MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) for available values.
   */
  @property() autocomplete: string;

  /** Indicates that the input should receive focus on page load. */
  @property({ type: Boolean }) autofocus: boolean;

  /** Used to customize the label or icon of the Enter key on virtual keyboards. */
  @property() enterkeyhint:
    | "enter"
    | "done"
    | "go"
    | "next"
    | "previous"
    | "search"
    | "send";

  /** Enables spell checking on the textarea. */
  @property({
    type: Boolean,
    converter: {
      // Allow "true|false" attribute values but keep the property boolean
      fromAttribute: (value) => (!value || value === "false" ? false : true),
      toAttribute: (value) => (value ? "true" : "false"),
    },
  })
  spellcheck = true;

  /**
   * Tells the browser what type of data will be entered by the user, allowing it to display the appropriate virtual
   * keyboard on supportive devices.
   */
  @property() inputmode:
    | "none"
    | "text"
    | "decimal"
    | "numeric"
    | "tel"
    | "search"
    | "email"
    | "url";

  /** The default value of the form control. Primarily used for resetting the form control. */
  @property() defaultValue = "";

  connectedCallback() {
    super.connectedCallback();
    this.resizeObserver = new ResizeObserver(() => this.setTextareaHeight());

    this.updateComplete.then(() => {
      this.setTextareaHeight();
      this.resizeObserver.observe(this.input);
    });
  }

  state: EditorState;

  view: EditorView;

  editorStateConfig() {
    return {
      schema,
      plugins: [keymap(baseKeymap)],
    };
  }

  firstUpdated() {
    this.state = EditorState.create(this.editorStateConfig());
    this.view = new EditorView(this.input, {
      state: this.state,
      handleDOMEvents: {
        change: () => this.handleChange(),
        input: () => this.handleInput(),
        focus: () => this.handleFocus(),
        blur: () => this.handleBlur(),
        click: (_, e) => e.stopPropagation(),
      },
    });

    this.addEventListener("click", () => this.focus());
  }

  emit(eventName: string) {
    this.dispatchEvent(new CustomEvent(eventName));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver.unobserve(this.input);
  }

  private handleBlur() {
    this.hasFocus = false;
    this.emit("sl-blur");
  }

  private handleChange() {
    this.setTextareaHeight();
    this.emit("sl-change");
  }

  private handleFocus() {
    this.hasFocus = true;
    this.emit("sl-focus");
  }

  private handleInput() {
    this.emit("sl-input");
  }

  private setTextareaHeight() {
    if (this.resize === "auto") {
      this.input.style.height = "auto";
      this.input.style.height = `${this.input.scrollHeight}px`;
    } else {
      (this.input.style.height as string | undefined) = undefined;
    }
  }

  @watch("disabled", { waitUntilFirstUpdate: true })
  handleDisabledChange() {
    // Disabled form controls are always valid
    // this.formControlController.setValidity(this.disabled);
  }

  // @watch('rows', { waitUntilFirstUpdate: true })
  // handleRowsChange() {
  //   this.setTextareaHeight();
  // }

  // @watch('value', { waitUntilFirstUpdate: true })
  // async handleValueChange() {
  //   await this.updateComplete;
  //   this.formControlController.updateValidity();
  //   this.setTextareaHeight();
  // }

  /** Sets focus on the textarea. */
  focus(options?: any) {
    this.view.focus();
  }

  /** Removes focus from the textarea. */
  blur() {
    this.input.blur();
  }

  /** Gets or sets the textarea's scroll position. */
  scrollPosition(position?: {
    top?: number;
    left?: number;
  }): { top: number; left: number } | undefined {
    if (position) {
      if (typeof position.top === "number") this.input.scrollTop = position.top;
      if (typeof position.left === "number")
        this.input.scrollLeft = position.left;
      return undefined;
    }

    return {
      top: this.input.scrollTop,
      left: this.input.scrollTop,
    };
  }

  /** Sets the start and end positions of the text selection (0-based). */
  setSelectionRange(
    selectionStart: number,
    selectionEnd: number,
    selectionDirection: "forward" | "backward" | "none" = "none"
  ) {
    this.input.quill.setSelectionRange(
      selectionStart,
      selectionEnd,
      selectionDirection
    );
  }

  /** Checks for validity but does not show a validation message. Returns `true` when valid and `false` when invalid. */

  /** Gets the associated form, if one exists. */
  getForm(): HTMLFormElement | null {
    return this.formControlController.form;
  }

  /** Checks for validity and shows the browser's validation message if the control is invalid. */
  reportValidity() {
    const invalid = this.required !== false && !this.value;
    if (invalid) {
      this._errorInput.setCustomValidity(msg("Field is required"));
      this._errorInput.reportValidity();
    }

    return !invalid;
  }

  reset() {
    setTimeout(() => {
      this.value = this.defaultValue;
    });
  }

  @query("#error-input")
  private _errorInput!: HTMLInputElement;

  render() {
    const hasLabelSlot = false;
    const hasHelpTextSlot = false;
    const hasLabel = this.label ? true : !!hasLabelSlot;
    const hasHelpText = this.helpText ? true : !!hasHelpTextSlot;

    return html`
      <div
        part="form-control"
        class=${classMap({
          "form-control": true,
          "form-control--small": this.size === "small",
          "form-control--medium": this.size === "medium",
          "form-control--large": this.size === "large",
          "form-control--has-label": hasLabel,
          "form-control--has-help-text": hasHelpText,
        })}
      >
        <label
          part="form-control-label"
          class="form-control__label"
          for="input"
          aria-hidden=${hasLabel ? "false" : "true"}
        >
          <slot name="label">${this.label}</slot>
        </label>

        <div part="form-control-input" class="form-control-input">
          <div
            part="base"
            class=${classMap({
              textarea: true,
              "textarea--small": this.size === "small",
              "textarea--medium": this.size === "medium",
              "textarea--large": this.size === "large",
              "textarea--standard": !this.filled,
              "textarea--filled": this.filled,
              "textarea--disabled": this.disabled,
              "textarea--focused": this.hasFocus,
              "textarea--empty": !this.value,
              "textarea--resize-none": this.resize === "none",
              "textarea--resize-vertical": this.resize === "vertical",
              "textarea--resize-auto": this.resize === "auto",
            })}
            style="position: relative"
          >
            <input
              id="error-input"
              style="position: absolute; z-index: -1; height: 100%; width: 100%"
            />
            <div
              part="textarea"
              id="input"
              class="textarea__control"
              title=${
                this
                  .title /* An empty title prevents browser validation tooltips from appearing on hover */
              }
              ?disabled=${this.disabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              ?autofocus=${this.autofocus}
              aria-describedby="help-text"
            ></div>
          </div>
        </div>

        <slot
          name="help-text"
          part="form-control-help-text"
          id="help-text"
          class="form-control__help-text"
          aria-hidden=${hasHelpText ? "false" : "true"}
        >
          ${this.helpText}
        </slot>
      </div>
    `;
  }
}
