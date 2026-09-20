import { resolveSecurityLinkBaseUrl } from "@/lib/server/security-link-url";

/**
 * Notification href values must be server-controlled relative app paths.
 */
export function assertSafeInternalNotificationHref(href: string): void {
  const trimmed = href.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    throw new Error("Invalid notification href");
  }
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) {
    throw new Error("Invalid notification href");
  }
}

export function buildNotificationAbsoluteHref(href: string): string {
  assertSafeInternalNotificationHref(href);
  return new URL(href, resolveSecurityLinkBaseUrl()).toString();
}
