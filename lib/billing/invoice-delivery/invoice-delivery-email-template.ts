import { formatBillingDateDisplay } from "@/lib/billing/native-billing-presentation";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import {
  INVOICE_DELIVERY_EMAIL_SCE_LOGO_CID,
  INVOICE_DELIVERY_EMAIL_TULIP_LOGO_CID,
} from "./invoice-delivery-email-inline-logos";

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

const BRAND_ORANGE = "#E8732E";
const BRAND_CHARCOAL = "#111B29";
const BRAND_MUTED = "#52525B";
const BRAND_BORDER = "#E4E4E7";
const BRAND_SURFACE = "#F4F4F5";

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

  const sceLogoSrc = `cid:${INVOICE_DELIVERY_EMAIL_SCE_LOGO_CID}`;
  const tulipLogoSrc = `cid:${INVOICE_DELIVERY_EMAIL_TULIP_LOGO_CID}`;

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND_SURFACE};font-family:Helvetica,Arial,sans-serif;color:${BRAND_CHARCOAL};-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND_SURFACE};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid ${BRAND_BORDER};border-radius:10px;overflow:hidden;">
          <tr>
            <td style="height:4px;background:${BRAND_ORANGE};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid ${BRAND_BORDER};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" valign="middle" style="padding:0;">
                    <img src="${sceLogoSrc}" width="168" height="37" alt="SportClubEvo" style="display:block;border:0;outline:none;text-decoration:none;max-width:168px;height:auto;" />
                  </td>
                  <td align="right" valign="middle" style="padding:0 0 0 16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="right">
                      <tr>
                        <td align="right" style="font-size:11px;line-height:1.4;color:${BRAND_MUTED};padding-bottom:6px;">powered by</td>
                      </tr>
                      <tr>
                        <td align="right">
                          <img src="${tulipLogoSrc}" width="88" height="23" alt="Tulip Digital" style="display:block;border:0;outline:none;text-decoration:none;max-width:88px;height:auto;opacity:0.92;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;font-size:16px;line-height:1.6;color:${BRAND_CHARCOAL};">
              <p style="margin:0 0 20px;">Guten Tag</p>
              <p style="margin:0 0 24px;">Im Anhang erhalten Sie Ihre Rechnung <strong style="font-weight:600;">${escapeHtml(input.invoiceNumber)}</strong> von SportClubEvo.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background:#FAFAFA;border:1px solid ${BRAND_BORDER};border-radius:8px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:0 0 14px;">
                          <div style="font-size:12px;line-height:1.4;color:${BRAND_MUTED};text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">Rechnungsbetrag</div>
                          <div style="margin-top:6px;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND_CHARCOAL};">${escapeHtml(amountFormatted)}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 0 0;border-top:1px solid ${BRAND_BORDER};">
                          <div style="font-size:12px;line-height:1.4;color:${BRAND_MUTED};text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">Fällig am</div>
                          <div style="margin-top:6px;font-size:16px;line-height:1.4;font-weight:600;color:${BRAND_CHARCOAL};">${escapeHtml(dueFormatted)}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 20px;">Die Zahlungsinformationen finden Sie direkt auf der Rechnung.</p>
              <p style="margin:0 0 28px;">Vielen Dank für Ihr Vertrauen.</p>
              <p style="margin:0;font-size:15px;line-height:1.5;">Freundliche Grüsse<br /><strong style="font-weight:600;color:${BRAND_CHARCOAL};">SportClubEvo</strong><br /><span style="color:${BRAND_MUTED};font-size:13px;">by Tulip Digital</span></p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid ${BRAND_BORDER};background:#FAFAFA;font-size:12px;line-height:1.5;color:${BRAND_MUTED};text-align:center;">
              SportClubEvo · Rechnungsstellung
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
