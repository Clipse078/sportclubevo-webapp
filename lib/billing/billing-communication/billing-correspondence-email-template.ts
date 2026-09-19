const BRAND_ORANGE = "#E8732E";
const BRAND_CHARCOAL = "#111B29";
const BRAND_MUTED = "#52525B";
const BRAND_BORDER = "#E4E4E7";
const BRAND_SURFACE = "#F4F4F5";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function plainTextToHtmlParagraphs(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs
    .map((paragraph) => {
      const lines = paragraph.split("\n").map((line) => escapeHtml(line));
      return `<p style="margin:0 0 16px;line-height:1.6;color:${BRAND_CHARCOAL};">${lines.join("<br />")}</p>`;
    })
    .join("");
}

export type BillingCorrespondenceEmailContent = {
  html: string;
  text: string;
};

export function buildBillingCorrespondenceEmailContent(message: string): BillingCorrespondenceEmailContent {
  const trimmed = message.trim();
  const text = [
    trimmed,
    "",
    "—",
    "SportClubEvo",
    "by Tulip Digital",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:${BRAND_SURFACE};font-family:Helvetica,Arial,sans-serif;color:${BRAND_CHARCOAL};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND_SURFACE};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid ${BRAND_BORDER};border-radius:10px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px 8px;border-bottom:3px solid ${BRAND_ORANGE};">
              <p style="margin:0;font-size:18px;font-weight:600;color:${BRAND_CHARCOAL};">SportClubEvo Abrechnung</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${plainTextToHtmlParagraphs(trimmed)}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid ${BRAND_BORDER};">
              <p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND_MUTED};">
                SportClubEvo · by Tulip Digital
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, text };
}
