/**
 * Lightweight security observability — structured console events only.
 * No external SIEM; no secrets in metadata.
 */

export type SecurityEventType = "AUTH_RATE_LIMITED" | "LOGIN_FAILED";

export type SecuritySurface =
  | "login"
  | "forgotPassword"
  | "resetPassword"
  | "invitationAccept"
  | "publicRegistration"
  | "invitationResend";

export type SecurityEventMetadata = {
  surface: SecuritySurface;
  /** Present only when legitimately resolved server-side (never from client input). */
  tenantId?: string;
};

export function logSecurityEvent(
  event: SecurityEventType,
  metadata: SecurityEventMetadata,
): void {
  console.info(
    JSON.stringify({
      securityEvent: event,
      surface: metadata.surface,
      ...(metadata.tenantId ? { tenantId: metadata.tenantId } : {}),
    }),
  );
}
