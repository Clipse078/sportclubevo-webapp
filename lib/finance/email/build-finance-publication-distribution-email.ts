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
  reportTitle: string;
  financeYearLabel: string;
  versionNumber: number;
  publishedAtLabel: string;
  senderDisplayName: string | null;
  optionalMessage: string | null;
  sharePublicToken: string;
  locale: string;
};

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
    : input.labels.greeting.replace("{sender}", input.tenantName);

  const optionalBlock =
    input.optionalMessage?.trim() ?
      `<p style="margin:16px 0 0;font-size:14px;color:#475569;line-height:1.6;"><strong>${input.labels.optionalMessageHeading}</strong><br/>${plainTextToSafeHtml(input.optionalMessage.trim()).replace(/^<p>|<\/p>$/g, "")}</p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="${input.locale}">
<body style="margin:0;padding:0;background:#F8FAFC;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;border:1px solid #E5E7EB;">
        <tr><td style="padding:28px 32px 8px;">
          <p style="margin:0;font-size:13px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;">${input.tenantName}</p>
          <h1 style="margin:12px 0 0;font-size:22px;color:#0F172A;line-height:1.35;">${input.reportTitle}</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#64748B;">${input.financeYearLabel} · Version ${input.versionNumber} · ${input.publishedAtLabel}</p>
        </td></tr>
        <tr><td style="padding:8px 32px 24px;">
          <p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.6;">${greeting}</p>
          <p style="margin:0;font-size:15px;color:#334155;line-height:1.6;">${intro}</p>
          ${optionalBlock}
          <table cellpadding="0" cellspacing="0" style="margin:24px 0 8px;"><tr>
            <td style="background:#2563EB;border-radius:8px;"><a href="${viewUrl}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${input.labels.viewReportCta}</a></td>
          </tr></table>
          <p style="margin:8px 0 0;font-size:13px;"><a href="${pdfUrl}" style="color:#2563EB;">${input.labels.downloadPdfCta}</a></p>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #F1F5F9;">
          <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.5;">${input.labels.footer.replace("{tenant}", input.tenantName)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const textParts = [
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
