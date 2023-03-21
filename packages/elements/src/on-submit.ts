import { AttributePart } from "lit";
import { directive, Directive } from "lit/directive.js";

function holoHashValue(value: any) {
  if (typeof value === "string" && value.split(",").length === 39)
    return new Uint8Array(value.split(",").map((s) => parseInt(s, 10)));
  return value;
}

/**
 * Serializes a form and returns a plain object. If a form control with the same name appears more than once, the
 * property will be converted to an array.
 */
export function serialize(form: HTMLFormElement) {
  const formData = new FormData(form);
  const object: Record<string, unknown> = {};

  formData.forEach((value, key) => {
    if (Reflect.has(object, key)) {
      const entry = object[key];
      if (Array.isArray(entry)) {
        entry.push(holoHashValue(value));
      } else {
        object[key] = [object[key], holoHashValue(value)];
      }
    } else {
      object[key] = holoHashValue(value);
    }
  });

  return object;
}

class OnSubmitDirective extends Directive {
  update(part: AttributePart, props: unknown[]) {
    setTimeout(() => {
      (part.element as HTMLFormElement).addEventListener(
        "submit",
        (e: SubmitEvent) => {
          e.preventDefault();
          const formData = serialize(part.element as HTMLFormElement) as Record<
            string,
            string
          >;
          (props[0] as (formData: any) => void)(formData);
        }
      );
    }, 100);
  }

  render(_onSubmitCallback: (formData: any) => void) {
    return ``;
  }
}
export const onSubmit = directive(OnSubmitDirective);
