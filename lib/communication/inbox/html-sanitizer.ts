/**
 * Conservative inbound HTML sanitizer — strips executable content and blocks remote images by default.
 */

const BLOCKED_TAGS = /<\/?(script|iframe|object|embed|link|meta|base|form|input|button|textarea|select|style)[^>]*>/gi;
const EVENT_HANDLERS = /\s(on\w+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URL = /\s(href|src|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\2/gi;

export function sanitizeInboundEmailHtml(html: string | null | undefined): string | null {
  if (!html?.trim()) return null;
  let sanitized = html
    .replace(BLOCKED_TAGS, "")
    .replace(EVENT_HANDLERS, "")
    .replace(JAVASCRIPT_URL, "");

  sanitized = blockRemoteImages(sanitized);
  return sanitized.trim() || null;
}

export function blockRemoteImages(html: string): string {
  return html.replace(
    /<img\b([^>]*)\bsrc\s*=\s*("|')([^"']+)\2([^>]*)>/gi,
    (_match, before, quote, src, after) =>
      `<img${before}data-blocked-remote-src=${quote}${src}${quote}${after}>`,
  );
}

export function plainTextFallback(bodyText: string | null | undefined, html: string | null | undefined): string {
  if (bodyText?.trim()) return bodyText.trim();
  if (!html?.trim()) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
