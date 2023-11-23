import { html, TemplateResult } from "lit";
import { AsyncStatus } from "@holochain-open-dev/stores";

/**
 * Renders the async status with an <sl-spinner> on pending, and <display-error> on error
 */
export function withSpinnerAndDisplayError<T>(renderers: {
  complete: (value: T) => TemplateResult;
  error: ((error: any) => TemplateResult) | { label: string; tooltip: boolean };
}) {
  return renderAsyncStatus({
    pending: () => html`<div
      style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
    >
      <sl-spinner style="font-size: 2rem;"></sl-spinner>
    </div>`,
    error: (e: any) =>
      typeof renderers.error === "function"
        ? renderers.error(e)
        : html`<display-error
            .headline=${renderers.error?.label}
            .tooltip=${renderers.error?.tooltip}
            .error=${e}
          ></display-error> `,
    complete: renderers.complete,
  });
}

/**
 * Renders the given AsyncStatus with the given renderers
 */
export function renderAsyncStatus<T>(renderers: {
  complete: (value: T) => TemplateResult;
  error: (error: any) => TemplateResult;
  pending: () => TemplateResult;
}) {
  return (status: AsyncStatus<T>) => {
    switch (status.status) {
      case "complete":
        return renderers.complete(status.value);
      case "error":
        return renderers.error(status.error);
      default:
        return renderers.pending();
    }
  };
}
