import { html, TemplateResult } from "lit";
import { AsyncStatus } from "@holochain-open-dev/stores";

/**
 * Renders the async status with an <sl-spinner> on pending, and <display-error> on error
 */
export function withSpinnerAndDisplayError<T>(renderers: {
  completed: (value: T) => TemplateResult;
  error: ((error: any) => TemplateResult) | { label: string; tooltip: boolean };
}) {
  return (status: AsyncStatus<T>) =>
    renderAsyncStatus(status, {
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
      completed: renderers.completed,
    });
}

/**
 * Renders the given AsyncStatus with the given renderers
 */
export function renderAsyncStatus<T>(
  status: AsyncStatus<T>,
  renderers: {
    completed: (value: T) => TemplateResult;
    error: (error: any) => TemplateResult;
    pending: () => TemplateResult;
  }
): TemplateResult {
  switch (status.status) {
    case "complete":
      return renderers.completed(status.value);
    case "error":
      return renderers.error(status.error);
    default:
      return renderers.pending();
  }
}
