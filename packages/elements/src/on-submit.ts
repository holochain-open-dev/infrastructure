import { AttributePart } from "lit";
import { directive, Directive } from "lit/directive.js";
import { serialize } from "@shoelace-style/shoelace/dist/utilities/form.js";

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
