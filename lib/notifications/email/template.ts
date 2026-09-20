export type NotificationEmailTemplateInput = {
  tenantName: string;
  platformName: string;
  notificationTitle: string;
  body: string;
  deadlineLabel?: string | null;
  ctaLabel: string;
  ctaUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderNotificationEmailHtml(input: NotificationEmailTemplateInput): string {
  const deadlineBlock = input.deadlineLabel
    ? `<p style="margin:16px 0 0;color:#444;font-size:14px;"><strong>Fällig:</strong> ${escapeHtml(input.deadlineLabel)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="de">
  <body style="margin:0;padding:24px;background:#f6f6f6;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#111;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #ececec;border-radius:8px;">
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#888;">${escapeHtml(input.platformName)} · ${escapeHtml(input.tenantName)}</p>
          <h1 style="margin:8px 0 12px;font-size:20px;line-height:1.3;color:#111;">${escapeHtml(input.notificationTitle)}</h1>
          <p style="margin:0;font-size:15px;line-height:1.5;color:#333;">${escapeHtml(input.body)}</p>
          ${deadlineBlock}
          <p style="margin:24px 0 0;">
            <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;padding:10px 16px;background:#e85d04;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">${escapeHtml(input.ctaLabel)}</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderNotificationEmailText(input: NotificationEmailTemplateInput): string {
  const lines = [
    `${input.platformName} · ${input.tenantName}`,
    "",
    input.notificationTitle,
    input.body,
  ];
  if (input.deadlineLabel) {
    lines.push(`Fällig: ${input.deadlineLabel}`);
  }
  lines.push("", `${input.ctaLabel}: ${input.ctaUrl}`);
  return lines.join("\n");
}
