import { mdiAlertOutline, mdiInformationOutline } from "@mdi/js";
import { wrapPathInSvg } from "icon";

// Always escape HTML for text arguments!
function escapeHtml(html) {
  const div = document.createElement("div");
  div.textContent = html;
  return div.innerHTML;
}

// Custom function to emit toast notifications
export function notify(
  message: string,
  variant = "primary",
  iconPath: string = mdiInformationOutline,
  duration = 3000
) {
  const alert = Object.assign(document.createElement("sl-alert"), {
    variant,
    closable: true,
    duration,
    innerHTML: `
        <sl-icon src="${wrapPathInSvg(iconPath)}" slot="icon"></sl-icon>
        ${escapeHtml(message)}
      `,
  });

  document.body.append(alert);
  return (alert as any).toast();
}

export function notifyError(message: string) {
  return notify(message, "danger", mdiAlertOutline);
}
