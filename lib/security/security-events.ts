/**
 * Lightweight security observability — structured console events only.
 * No external SIEM; no secrets in metadata.
 */

export type SecurityEventType = "AUTH_RATE_LIMITED" | "LOGIN_FAILED";

/** Internal login-failure taxonomy — never exposed on the public login UI. */
export type LoginFailureCategory =
  | "MISSING_CREDENTIALS"
  | "USER_LOOKUP_FAILED"
  | "USER_NOT_FOUND"
  | "ACCOUNT_DISABLED"
  | "CREDENTIAL_VERIFICATION_FAILED"
  | "SESSION_CONTEXT_FAILED"
  | "AUTH_CONFIGURATION_ERROR";

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
  /** Server-side login diagnosis only; must not include email, password, or hash material. */
  authFailureCategory?: LoginFailureCategory;
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
      ...(metadata.authFailureCategory
        ? { authFailureCategory: metadata.authFailureCategory }
        : {}),
    }),
  );
}

/** Structured LOGIN_FAILED for credentials authorize() — no user enumeration fields. */
export function logLoginFailure(category: LoginFailureCategory): void {
  logSecurityEvent("LOGIN_FAILED", {
    surface: "login",
    authFailureCategory: category,
  });
}
