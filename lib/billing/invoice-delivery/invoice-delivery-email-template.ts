import { formatBillingDateDisplay } from "@/lib/billing/native-billing-presentation";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";

export type InvoiceDeliveryEmailLocale = "de";

export type InvoiceDeliveryEmailTemplateInput = {
  locale: InvoiceDeliveryEmailLocale;
  invoiceNumber: string;
  grossTotalMinor: number;
  currency: string;
  dueDate: Date | null;
};

export type InvoiceDeliveryEmailContent = {
  subject: string;
  html: string;
  text: string;
};

function formatDueDate(dueDate: Date | null): string {
  if (!dueDate) {
    return "—";
  }
  return formatBillingDateDisplay(dueDate);
}

export function buildInvoiceDeliveryEmailContent(
  input: InvoiceDeliveryEmailTemplateInput,
): InvoiceDeliveryEmailContent {
  const amountFormatted = formatBillingMoney(input.grossTotalMinor, input.currency);
  const dueFormatted = formatDueDate(input.dueDate);

  const subject = `Rechnung ${input.invoiceNumber} – SportClubEvo`;

  const text = [
    "Guten Tag",
    "",
    `Im Anhang erhalten Sie Ihre Rechnung ${input.invoiceNumber} von SportClubEvo.`,
    "",
    "Rechnungsbetrag:",
    amountFormatted,
    "",
    "Fällig am:",
    dueFormatted,
    "",
    "Die Zahlungsinformationen finden Sie direkt auf der Rechnung.",
    "",
    "Vielen Dank für Ihr Vertrauen.",
    "",
    "Freundliche Grüsse",
    "SportClubEvo",
    "by Tulip Digital",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;">
          <tr>
            <td style="padding:28px 32px 8px;font-size:16px;line-height:1.5;">
              <p style="margin:0 0 16px;">Guten Tag</p>
              <p style="margin:0 0 16px;">Im Anhang erhalten Sie Ihre Rechnung <strong>${escapeHtml(input.invoiceNumber)}</strong> von SportClubEvo.</p>
              <p style="margin:0 0 4px;color:#52525b;font-size:14px;">Rechnungsbetrag:</p>
              <p style="margin:0 0 16px;font-size:18px;font-weight:600;">${escapeHtml(amountFormatted)}</p>
              <p style="margin:0 0 4px;color:#52525b;font-size:14px;">Fällig am:</p>
              <p style="margin:0 0 16px;font-weight:600;">${escapeHtml(dueFormatted)}</p>
              <p style="margin:0 0 16px;">Die Zahlungsinformationen finden Sie direkt auf der Rechnung.</p>
              <p style="margin:0 0 16px;">Vielen Dank für Ihr Vertrauen.</p>
              <p style="margin:0;">Freundliche Grüsse<br />SportClubEvo<br /><span style="color:#71717a;font-size:13px;">by Tulip Digital</span></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function resolveInvoiceDeliveryLocale(
  customerDefaultLanguage: string | null | undefined,
): InvoiceDeliveryEmailLocale {
  const normalized = customerDefaultLanguage?.trim().toLowerCase();
  if (normalized?.startsWith("de")) {
    return "de";
  }
  return "de";
}
