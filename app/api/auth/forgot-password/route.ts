/**
 * POST /api/auth/forgot-password
 *
 * USER-ADMIN-01 — Forgot-password request endpoint.
 *
 * Security properties:
 *   - Opaque response: always returns the same 200 JSON regardless of
 *     whether the email exists — never reveals user enumeration.
 *   - Rate limiting: application best-effort 5 / 15 min per IP; Vercel WAF
 *     provides distributed protection (see docs/security/vercel-auth-rate-limits.md).
 *   - Token: raw token is never logged; only the SHA-256 hash is stored.
 *   - Reset URL: constructed via resolveSecurityLinkBaseUrl (APP_BASE_URL / NEXTAUTH_URL).
 *   - Missing RESEND_API_KEY or EMAIL_FROM: email delivery fails internally
 *     (MailConfigurationError) while the external response remains opaque.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createPasswordResetToken, TOKEN_EXPIRY_MS } from "@/lib/auth/password-reset";
import { sendMail, MailConfigurationError } from "@/lib/email/mailer";
import { buildPasswordResetEmail } from "@/lib/email/templates/password-reset";
import {
  buildPasswordResetLink,
  resolveSecurityLinkBaseUrl,
  SecurityLinkConfigurationError,
} from "@/lib/server/security-link-url";
import { platformSuperAdminAssignmentWhere } from "@/lib/security/platform-superadmin";
import { getClientIp } from "@/lib/security/client-ip";
import {
  AUTH_SECURITY_MESSAGES,
  checkApplicationRateLimit,
} from "@/lib/security/abuse-policy";
import { createRateLimitResponse, GENERIC_RATE_LIMIT_MESSAGE } from "@/lib/security/rate-limit-response";
import { logSecurityEvent } from "@/lib/security/security-events";

const OPAQUE_SUCCESS = {
  message: AUTH_SECURITY_MESSAGES.forgotPasswordSuccess,
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateCheck = checkApplicationRateLimit("forgotPassword", ip);
  if (!rateCheck.allowed) {
    logSecurityEvent("AUTH_RATE_LIMITED", { surface: "forgotPassword" });
    return createRateLimitResponse(rateCheck.retryAfterMs, {
      error: GENERIC_RATE_LIMIT_MESSAGE,
    });
  }

  let email: string;
  try {
    const body = await req.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Ungültige E-Mail-Adresse." }, { status: 400 });
  }

  // Look up the user — never reveal the result to the caller.
  let userId: string | null = null;
  let userEmail: string | null = null;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isActive: true,
        userRoles: {
          where: platformSuperAdminAssignmentWhere,
          select: { id: true },
          take: 1,
        },
      },
    });

    // Public recovery is intentionally unavailable to platform Superadmins.
    // Preserve the same opaque response and do not issue or send a token.
    if (user && user.isActive && user.userRoles.length === 0) {
      userId = user.id;
      userEmail = user.email;
    }
  } catch (err) {
    console.error(
      "[forgot-password] user lookup error",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json(OPAQUE_SUCCESS, { status: 200 });
  }

  // If the user exists and is active, create a token and attempt delivery.
  // All internal failures are caught and logged without exposing token values,
  // reset URLs, or account existence to the caller.
  if (userId && userEmail) {
    try {
      const appBaseUrl = resolveSecurityLinkBaseUrl().toString().replace(/\/$/, "");
      const rawToken = await createPasswordResetToken(prisma, userId);
      const resetUrl = buildPasswordResetLink(rawToken);
      const expiryMinutes = Math.round(TOKEN_EXPIRY_MS / 60000);

      const { subject, html, text } = buildPasswordResetEmail({
        resetUrl,
        recipientEmail: userEmail,
        expiryMinutes,
        appBaseUrl,
      });

      await sendMail({ to: userEmail, subject, html, text });
    } catch (err) {
      const isConfigError = err instanceof MailConfigurationError;
      const isLinkConfigError = err instanceof SecurityLinkConfigurationError;

      if (isLinkConfigError) {
        console.error(
          "[forgot-password] invalid security link configuration",
          err.code,
        );
      } else if (isConfigError) {
        console.error("[forgot-password] mail configuration error:", (err as Error).message);
      } else {
        console.error(
          "[forgot-password] token/email delivery error",
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }

  return NextResponse.json(OPAQUE_SUCCESS, { status: 200 });
}
