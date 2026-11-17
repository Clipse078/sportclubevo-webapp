/**
 * Invitation email template — SportClubEvo × club branding.
 *
 * Sent when an admin invites a person to join a tenant. The link
 * uses the same password-reset infrastructure (PasswordResetToken
 * with isInvitation=true) so the recipient can set their own password
 * on first login, or accept into an existing account.
 */

import { escapeHtml } from "@/lib/email/escape-html";

export type InvitationEmailVariant = "new_account" | "existing_account";

export type InvitationEmailData = {
  inviteUrl: string;
  recipientEmail: string;
  recipientFirstName: string;
  tenantName: string;
  inviterDisplayName?: string;
  expiryHours: number;
  /** Absolute HTTPS base URL. Must not end with a slash. */
  appBaseUrl?: string;
  variant?: InvitationEmailVariant;
  /** Short German summary of offered access (no permission keys). */
  accessSummary?: string;
};

const NAVY = "#0F172A";
const BODY = "#334155";
const MUTED = "#64748B";
/** Primary email CTA — SCE copper hover token for WCAG AA contrast with white text (≥4.5:1). */
const CTA_BACKGROUND = "#9A5F28";
const COPPER = "#B87333";
const BORDER = "#E2E8F0";

export function buildInvitationEmail(data: InvitationEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    inviteUrl,
    recipientFirstName,
    tenantName,
    inviterDisplayName,
    expiryHours,
    appBaseUrl,
    variant = "new_account",
    accessSummary,
  } = data;

  const logoUrl = appBaseUrl
    ? `${appBaseUrl}/images/branding/sportclubevo_logo.png`
    : "";

  const subject = `Einladung zu ${tenantName} auf SportClubEvo`;

  const safeTenant = escapeHtml(tenantName);
  const safeFirst = escapeHtml(recipientFirstName || "du");
  const safeInviter = inviterDisplayName ? escapeHtml(inviterDisplayName) : null;
  const safeUrl = escapeHtml(inviteUrl);
  const safeSummary = accessSummary ? escapeHtml(accessSummary) : null;

  const introExisting = safeInviter
    ? `${safeInviter} hat dich eingeladen, dem Vereinsbereich <strong style="color:${NAVY};">${safeTenant}</strong> auf SportClubEvo beizutreten.`
    : `Du wurdest eingeladen, dem Vereinsbereich <strong style="color:${NAVY};">${safeTenant}</strong> auf SportClubEvo beizutreten.`;

  const activationCopy =
    variant === "existing_account"
      ? `Mit deinem bestehenden SportClubEvo-Konto kannst du die Einladung annehmen — es ist <strong>kein neues Konto</strong> nötig.`
      : `Klicke auf den Button, um dein Konto zu aktivieren und dein Passwort festzulegen.`;

  const ctaLabel = "Einladung annehmen";

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:${BODY};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid ${BORDER};">
              ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="SportClubEvo" width="148" height="auto" style="display:block;height:auto;" />` : `<span style="font-size:18px;font-weight:700;color:${NAVY};">SportClubEvo</span>`}
              <p style="margin:12px 0 0;font-size:13px;color:${MUTED};line-height:1.5;">${safeTenant}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${NAVY};line-height:1.35;">
                Einladung zu ${safeTenant}
              </h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BODY};">
                Hallo ${safeFirst},
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BODY};">
                ${introExisting}
              </p>
              ${
                safeSummary
                  ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:${BODY};"><strong style="color:${NAVY};">Zugang:</strong> ${safeSummary}</p>`
                  : ""
              }
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BODY};">
                ${activationCopy}
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td style="background:${CTA_BACKGROUND};border-radius:8px;">
                    <a href="${safeUrl}"
                       style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background:${CTA_BACKGROUND};">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:${MUTED};">
                Dieser Link ist ${expiryHours} Stunden gültig und kann nur einmal verwendet werden.
              </p>
              <p style="margin:0 0 16px;font-size:13px;line-height:1.55;color:${MUTED};">
                Falls du diese Einladung nicht erwartest, kannst du diese E-Mail ignorieren.
              </p>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.55;color:${MUTED};">
                Link funktioniert nicht? Kopiere diese Adresse in deinen Browser:<br />
                <span style="word-break:break-all;color:${BODY};">${safeUrl}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid ${BORDER};background:#FAFAFA;">
              <p style="margin:0;font-size:12px;color:${MUTED};text-align:center;line-height:1.5;">
                SportClubEvo · Vereinsverwaltung für ${safeTenant}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textExisting =
    variant === "existing_account"
      ? "Mit deinem bestehenden SportClubEvo-Konto kannst du die Einladung annehmen — kein neues Konto nötig."
      : "Lege mit dem Link dein Passwort fest, um dein Konto zu aktivieren.";

  const textInviter = inviterDisplayName
    ? `${inviterDisplayName} hat dich eingeladen.\n`
    : "";

  const text = `${subject}

Hallo ${recipientFirstName || "du"},

${textInviter}Du wurdest eingeladen, dem ${tenantName}-Bereich auf SportClubEvo beizutreten.
${accessSummary ? `Zugang: ${accessSummary}\n` : ""}
${textExisting}

${ctaLabel}:
${inviteUrl}

Gültigkeit: ${expiryHours} Stunden, einmalige Verwendung.

Falls du diese Einladung nicht erwartest, ignoriere diese E-Mail.

SportClubEvo · ${tenantName}
`;

  return { subject, html, text };
}