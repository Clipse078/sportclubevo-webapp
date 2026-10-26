/**
 * FIN-06E — transactional publication distribution email (tenant-primary branding).
 */

import { plainTextToSafeHtml } from "@/lib/communication/outbound-email-service";
import { buildNotificationAbsoluteHref } from "@/lib/notifications/internal-href";
import {
  financePublicationSharePath,
  financePublicationSharePdfApiPath,
} from "@/lib/finance/publishing/finance-publication-share-path";

export type FinancePublicationDistributionEmailLabels = {
  subject: string;
  greeting: string;
  intro: string;
  optionalMessageHeading: string;
  viewReportCta: string;
  downloadPdfCta: string;
  footer: string;
};

export type BuildFinancePublicationDistributionEmailInput = {
  labels: FinancePublicationDistributionEmailLabels;
  tenantName: string;
  tenantLogoAbsoluteUrl: string | null;
  sceLogoAbsoluteUrl: string;
  reportTitle: string;
  financeYearLabel: string;
  versionNumber: number;
  publishedAtLabel: string;
  senderDisplayName: string | null;
  optionalMessage: string | null;
  sharePublicToken: string;
  locale: string;
};

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildTenantHeaderBlock(input: BuildFinancePublicationDistributionEmailInput): string {
  const tenantNameEscaped = escapeHtmlAttribute(input.tenantName);
  if (input.tenantLogoAbsoluteUrl) {
    const logoSrc = escapeHtmlAttribute(input.tenantLogoAbsoluteUrl);
    return `<table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      <tr>
        <td style="padding:0 0 12px;">
          <img src="${logoSrc}" alt="${tenantNameEscaped}" width="72" height="72" style="display:block;max-width:72px;max-height:72px;width:auto;height:auto;border:0;outline:none;" />
        </td>
      </tr>
      <tr>
        <td>
          <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#334155;">${input.tenantName}</p>
        </td>
      </tr>
    </table>`;
  }

  return `<p style="margin:0 0 16px;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#334155;">${input.tenantName}</p>`;
}

function buildSceFooterBlock(input: BuildFinancePublicationDistributionEmailInput): string {
  const sceLogoSrc = escapeHtmlAttribute(input.sceLogoAbsoluteUrl);
  const footerText = input.labels.footer.replace("{tenant}", input.tenantName);
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
    <tr>
      <td style="padding-top:16px;border-top:1px solid #E2E8F0;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:0 10px 6px 0;vertical-align:middle;">
              <img src="${sceLogoSrc}" alt="SportClubEvo" width="96" height="21" style="display:block;max-width:96px;height:auto;border:0;outline:none;opacity:0.85;" />
            </td>
          </tr>
          <tr>
            <td>
              <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.5;">${footerText}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

export function buildFinancePublicationDistributionEmail(
  input: BuildFinancePublicationDistributionEmailInput,
): { subject: string; html: string; text: string } {
  const sharePath = financePublicationSharePath(input.sharePublicToken);
  const viewUrl = buildNotificationAbsoluteHref(sharePath);
  const pdfUrl = buildNotificationAbsoluteHref(
    financePublicationSharePdfApiPath(input.sharePublicToken),
  );

  const subject = input.labels.subject
    .replace("{tenant}", input.tenantName)
    .replace("{year}", input.financeYearLabel)
    .replace("{version}", String(input.versionNumber));

  const intro = input.labels.intro
    .replace("{tenant}", input.tenantName)
    .replace("{report}", input.reportTitle)
    .replace("{year}", input.financeYearLabel)
    .replace("{version}", String(input.versionNumber))
    .replace("{publishedAt}", input.publishedAtLabel);

  const greeting = input.senderDisplayName
    ? input.labels.greeting.replace("{sender}", input.senderDisplayName)
    : input.labels.greeting;

  const optionalBlock =
    input.optionalMessage?.trim() ?
      `<p style="margin:20px 0 0;padding:14px 16px;font-size:14px;color:#475569;line-height:1.6;background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;"><strong style="color:#334155;">${input.labels.optionalMessageHeading}</strong><br/>${plainTextToSafeHtml(input.optionalMessage.trim()).replace(/^<p>|<\/p>$/g, "")}</p>`
    : "";

  const tenantHeader = buildTenantHeaderBlock(input);
  const sceFooter = buildSceFooterBlock(input);

  const html = `<!DOCTYPE html>
<html lang="${escapeHtmlAttribute(input.locale)}">
<body style="margin:0;padding:0;background:#F8FAFC;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;border:1px solid #E5E7EB;">
        <tr><td style="padding:28px 32px 8px;">
          ${tenantHeader}
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#0F172A;line-height:1.35;">${input.reportTitle}</h1>
          <p style="margin:10px 0 0;font-size:14px;color:#64748B;line-height:1.5;">${input.financeYearLabel} · Version ${input.versionNumber} · ${input.publishedAtLabel}</p>
        </td></tr>
        <tr><td style="padding:8px 32px 24px;">
          <p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.6;">${greeting}</p>
          <p style="margin:0;font-size:15px;color:#334155;line-height:1.6;">${intro}</p>
          ${optionalBlock}
          <table cellpadding="0" cellspacing="0" style="margin:28px 0 12px;"><tr>
            <td style="background:#1D4ED8;border-radius:8px;"><a href="${viewUrl}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${input.labels.viewReportCta}</a></td>
          </tr></table>
          <p style="margin:0;font-size:14px;line-height:1.5;"><a href="${pdfUrl}" style="color:#1D4ED8;font-weight:600;text-decoration:none;">${input.labels.downloadPdfCta}</a></p>
        </td></tr>
        <tr><td style="padding:8px 32px 24px;">
          ${sceFooter}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const textParts = [
    input.tenantName,
    input.reportTitle,
    `${input.financeYearLabel} · Version ${input.versionNumber} · ${input.publishedAtLabel}`,
    "",
    greeting,
    "",
    intro,
    input.optionalMessage?.trim() ?
      `${input.labels.optionalMessageHeading}\n${input.optionalMessage.trim()}`
    : "",
    "",
    `${input.labels.viewReportCta}: ${viewUrl}`,
    `${input.labels.downloadPdfCta}: ${pdfUrl}`,
    "",
    input.labels.footer.replace("{tenant}", input.tenantName),
  ].filter((line) => line !== undefined);

  return { subject, html, text: textParts.join("\n") };
}
