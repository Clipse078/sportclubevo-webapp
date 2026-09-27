import { plainTextToSafeHtml } from "@/lib/communication/outbound-email-service";
import { buildNotificationAbsoluteHref } from "@/lib/notifications/internal-href";

export type RenderPlatformCommunicationEmailInput = {
  tenantName: string;
  subject: string | null;
  bodyText: string;
  includeDeepLink: boolean;
  deepLinkPath?: string | null;
};

export type RenderedPlatformCommunicationEmail = {
  subject: string;
  html: string;
  text: string;
};

function sanitizeSubject(subject: string | null, tenantName: string): string {
  const trimmed = subject?.trim();
  if (trimmed) return trimmed.slice(0, 240);
  return `${tenantName} — Mitteilung`;
}

export function renderPlatformCommunicationEmail(
  input: RenderPlatformCommunicationEmailInput,
): RenderedPlatformCommunicationEmail {
  const subject = sanitizeSubject(input.subject, input.tenantName);
  const body = input.bodyText.trim();
  const deepLink =
    input.includeDeepLink && input.deepLinkPath
      ? buildNotificationAbsoluteHref(input.deepLinkPath)
      : null;

  const textParts = [
    body,
    deepLink ? `\n\nIm SportClubEvo öffnen:\n${deepLink}` : "",
    `\n\n— ${input.tenantName}`,
  ].filter(Boolean);

  const htmlParts = [
    plainTextToSafeHtml(body).replace("<p>", '<p style="margin:0 0 12px;font-family:sans-serif;">'),
    deepLink
      ? `<p style="margin:16px 0 0;font-family:sans-serif;"><a href="${deepLink}">Im SportClubEvo öffnen</a></p>`
      : "",
    `<p style="margin:24px 0 0;font-size:12px;color:#666;font-family:sans-serif;">${input.tenantName}</p>`,
  ].filter(Boolean);

  return {
    subject,
    text: textParts.join("\n"),
    html: `<!DOCTYPE html><html><body>${htmlParts.join("")}</body></html>`,
  };
}
