/** A4 portrait (mm). */
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

/** SIX Swiss QR-bill regulated section (mm). */
export const SWISS_RECEIPT_WIDTH_MM = 62;
export const SWISS_PAYMENT_PART_WIDTH_MM = 148;
export const SWISS_PAYMENT_SECTION_HEIGHT_MM = 105;
/** Printed Swiss QR symbol (IG §6.4), excluding quiet zone. */
export const SWISS_QR_CODE_SIZE_MM = 46;
/** Style guide: 5 mm unprinted border around the 46 mm symbol (≥ 4 modules / 1.6 mm). */
export const SWISS_QR_QUIET_ZONE_MM = 5;
/** Recognition symbol overlay (IG §6.4.2); must match official SIX artwork at print size. */
export const SWISS_CROSS_SIZE_MM = 7;

/**
 * Official SIX black/white Swiss QR recognition symbol (7×7 mm at print).
 * Source: SIX Swiss Payment Standards
 * Asset: Black-White Cross for Swiss QR Code (Download Centre: swiss-cross-graphic-en.zip)
 */
export const SWISS_QR_RECOGNITION_CROSS_ASSET_PATH =
  "lib/billing/invoice-pdf/assets/six-swiss-qr-black-white-cross-7mm.png";

/** SHA-256 of the unmodified CH-Kreuz_7mm.png from the official SIX ZIP. */
export const SWISS_QR_RECOGNITION_CROSS_ASSET_SHA256 =
  "1322fcfc8b87bffc57da0b3c9c5a22adfbbcb07f62dda4a005d8dc2824612320";

export const INVOICE_PDF_BRAND = {
  /** SCE navy ~#111B29 */
  headerNavy: { r: 17 / 255, g: 27 / 255, b: 41 / 255 },
  orange: { r: 0.91, g: 0.45, b: 0.18 },
  orangeMuted: { r: 1, g: 0.94, b: 0.9 },
  /** Primary body text ~#17202D */
  text: { r: 23 / 255, g: 32 / 255, b: 45 / 255 },
  muted: { r: 0.45, g: 0.48, b: 0.52 },
  tableHeaderBg: { r: 0.95, g: 0.96, b: 0.97 },
  white: { r: 1, g: 1, b: 1 },
} as const;

/** White/orange mark for dark invoice header (public web canonical). */
export const SPORTCLUBEVO_HEADER_LOGO_PATH =
  "public/images/branding/sportclubevo_logo_alt.png";
/** Serverless-safe copy of {@link SPORTCLUBEVO_HEADER_LOGO_PATH} for PDF embed. */
export const SPORTCLUBEVO_HEADER_LOGO_ASSET_PATH =
  "lib/billing/invoice-pdf/assets/sportclubevo-header-logo-alt.png";
/** SHA-256 of unmodified sportclubevo_logo_alt.png (864×174). */
export const SPORTCLUBEVO_HEADER_LOGO_ASSET_SHA256 =
  "0ecf986930e0b9898e3038b7b3047462c60bf972f3066db4aab736da93a097a4";
/** Full-color mark for white invoice body (footer operator row). */
export const SPORTCLUBEVO_FOOTER_LOGO_PATH = "public/images/branding/sportclubevo_logo.png";
/** Serverless-safe copy of {@link SPORTCLUBEVO_FOOTER_LOGO_PATH} for PDF embed. */
export const SPORTCLUBEVO_FOOTER_LOGO_ASSET_PATH =
  "lib/billing/invoice-pdf/assets/sportclubevo-footer-logo.png";
/** SHA-256 of unmodified sportclubevo_logo.png (937×204). */
export const SPORTCLUBEVO_FOOTER_LOGO_ASSET_SHA256 =
  "4ff6d498f234b4c44173242d2af650d890e479681a66024d571e577f973d8db8";
/** @deprecated Use SPORTCLUBEVO_HEADER_LOGO_PATH or SPORTCLUBEVO_FOOTER_LOGO_PATH. */
export const SPORTCLUBEVO_LOGO_PATH = SPORTCLUBEVO_HEADER_LOGO_PATH;
export const TULIP_DIGITAL_LOGO_PATH =
  "public/images/branding/tulip-digital-logo1.png";
/** Approved compact header accent (SWISS-01E4C); far-right crop only. */
export const INVOICE_HEADER_JPG_PATH = "public/images/branding/invoice.jpg";
/** Left edge of source crop (fraction of source width). Right ~18% of artwork. */
export const HEADER_JPG_SOURCE_CROP_X_FRACTION = 0.82;
/** @deprecated Retired from invoice header in SWISS-01E4C. */
export const INVOICE_HEADER_RIBBON_ACCENT_PATH =
  "public/images/branding/sce-invoice-header-ribbon-accent.png";

export const INVOICE_PDF_SITE_URL = "www.sportclubevo.com";
