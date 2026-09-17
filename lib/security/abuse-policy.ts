/**
 * Canonical application-layer abuse policy for authentication and
 * identity-related public surfaces.
 *
 * Architecture:
 *   EDGE (Vercel WAF)  — coarse distributed burst protection (see docs)
 *   APPLICATION (this) — cooldowns, generic responses, in-process limits
 *
 * Rate-limit keys are tenant-neutral (IP / surface) unless a scoped
 * business rule explicitly requires tenantId from authorized server context.
 */

import { checkRateLimit, type RateLimitResult } from "@/lib/auth/rate-limit";

// ── WAF contract mirror (configure manually in Vercel — see docs) ─────────────

export const WAF_AUTH_RATE_LIMITS = {
  authenticationBurst: {
    pathPatterns: ["/api/auth/*"],
    methods: ["POST"],
    countingKey: "IP",
    threshold: 10,
    windowSeconds: 60,
  },
  forgotPassword: {
    pathPatterns: ["/api/auth/forgot-password"],
    methods: ["POST"],
    countingKey: "IP",
    threshold: 5,
    windowSeconds: 900,
  },
  resetAndInvitationTokens: {
    pathPatterns: ["/api/auth/reset-password", "/api/auth/invitation/accept"],
    methods: ["POST"],
    countingKey: "IP",
    threshold: 10,
    windowSeconds: 600,
  },
  publicRegistrations: {
    pathPatterns: ["/api/public/*/registrations"],
    methods: ["POST"],
    countingKey: "IP",
    threshold: 5,
    windowSeconds: 60,
  },
} as const;

// ── Application in-process limits (defense-in-depth, single-instance) ─────

export const APP_RATE_LIMITS = {
  login: { limit: 10, windowMs: 60_000 },
  forgotPassword: { limit: 5, windowMs: 15 * 60_000 },
  resetPassword: { limit: 10, windowMs: 10 * 60_000 },
  invitationAccept: { limit: 10, windowMs: 10 * 60_000 },
  publicRegistration: { limit: 5, windowMs: 60_000 },
} as const;

/** Minimum time between invitation resends per tenant + target user. */
export const INVITATION_RESEND_COOLDOWN_MS = 60_000;

export const AUTH_SECURITY_MESSAGES = {
  invalidCredentials: "Ungültige E-Mail oder Passwort. Bitte nochmals versuchen.",
  invalidOrExpiredToken:
    "Ungültiger oder abgelaufener Link. Bitte fordere einen neuen an.",
  invalidInvitationLink:
    "Einladungslink ist ungültig, abgelaufen oder bereits verwendet.",
  forgotPasswordSuccess:
    "Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir dir einen Link zum Zurücksetzen des Passworts gesendet.",
  forgotPasswordRateLimited:
    "Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir dir einen Link zum Zurücksetzen des Passworts gesendet.",
} as const;

export type AbusePolicySurface = keyof typeof APP_RATE_LIMITS;

export function buildApplicationRateLimitKey(
  surface: AbusePolicySurface,
  identityKey: string,
): string {
  return `${surface}:${identityKey}`;
}

/**
 * Best-effort in-process rate limit check for a sensitive surface.
 * Primary distributed protection is Vercel WAF — see docs/security/vercel-auth-rate-limits.md.
 */
export function checkApplicationRateLimit(
  surface: AbusePolicySurface,
  identityKey: string,
): RateLimitResult {
  const config = APP_RATE_LIMITS[surface];
  return checkRateLimit(
    buildApplicationRateLimitKey(surface, identityKey),
    config.limit,
    config.windowMs,
  );
}
