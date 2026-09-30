/**
 * POST /api/auth/reset-password
 *
 * USER-ADMIN-01 — Password reset consumption endpoint.
 *
 * Validates the reset token and updates the user's password.
 * On success, sets passwordChangedAt so existing JWT sessions can be
 * detected as stale by future middleware/auth checks.
 *
 * Password policy: minimum 12 characters.
 *
 * SESSION INVALIDATION NOTE:
 *   passwordChangedAt is stored but existing JWT sessions are NOT actively
 *   invalidated on password reset in this slice. JWTs remain valid until
 *   natural expiry. Robust stale-session enforcement (checking
 *   passwordChangedAt against the JWT iat/session timestamp on every
 *   request) is tracked as a follow-up USER-ADMIN security slice.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  consumePasswordResetToken,
  inspectPasswordResetToken,
} from "@/lib/auth/password-reset";
import { passwordResetTokenIssueMessage } from "@/lib/auth/invitation-token-messages";
import { getClientIp } from "@/lib/security/client-ip";
import {
  AUTH_SECURITY_MESSAGES,
  checkApplicationRateLimit,
} from "@/lib/security/abuse-policy";
import { createRateLimitResponse } from "@/lib/security/rate-limit-response";
import { logSecurityEvent } from "@/lib/security/security-events";

const MIN_PASSWORD_LENGTH = 12;

export async function POST(req: NextRequest) {
  const rateCheck = checkApplicationRateLimit("resetPassword", getClientIp(req));
  if (!rateCheck.allowed) {
    logSecurityEvent("AUTH_RATE_LIMITED", { surface: "resetPassword" });
    return createRateLimitResponse(rateCheck.retryAfterMs);
  }

  let token: string;
  let newPassword: string;
  let confirmPassword: string;

  try {
    const body = await req.json();
    token = typeof body?.token === "string" ? body.token.trim() : "";
    newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json(
      { error: AUTH_SECURITY_MESSAGES.invalidOrExpiredToken },
      { status: 400 },
    );
  }

  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.` },
      { status: 400 },
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "Die Passwörter stimmen nicht überein." },
      { status: 400 },
    );
  }

  const presentation = await inspectPasswordResetToken(prisma, token);
  if (!presentation.valid) {
    return NextResponse.json(
      {
        error: passwordResetTokenIssueMessage(
          presentation.issue,
          presentation.isInvitation,
        ),
      },
      { status: 400 },
    );
  }

  let consumed: Awaited<ReturnType<typeof consumePasswordResetToken>> = null;
  try {
    consumed = await consumePasswordResetToken(prisma, token, newPassword);
  } catch (err) {
    console.error("[reset-password] consumePasswordResetToken error", {
      surface: "resetPassword",
      isInvitation: presentation.isInvitation,
      userId: presentation.userId,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: AUTH_SECURITY_MESSAGES.activationTechnicalFailure },
      { status: 500 },
    );
  }

  if (!consumed) {
    return NextResponse.json(
      {
        error: passwordResetTokenIssueMessage(
          "invalid",
          presentation.isInvitation,
        ),
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}

/**
 * GET /api/auth/reset-password?token=...
 *
 * Pre-validates a token before the user sees the reset form — allows
 * the page to show an "invalid/expired" message immediately instead of
 * after the user fills in their new password.
 *
 * For invitation tokens, also returns contextual metadata so the client
 * can render invitation-specific UI (club name, existing-user guidance, etc.).
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";

  if (!token) {
    return NextResponse.json({ valid: false, issue: "invalid" as const }, { status: 200 });
  }

  try {
    const presentation = await inspectPasswordResetToken(prisma, token);
    if (!presentation.valid) {
      return NextResponse.json(
        {
          valid: false,
          issue: presentation.issue,
          message: passwordResetTokenIssueMessage(
            presentation.issue,
            presentation.isInvitation,
          ),
        },
        { status: 200 },
      );
    }

    if (!presentation.isInvitation) {
      return NextResponse.json({ valid: true, isInvitation: false }, { status: 200 });
    }

    let tenantName: string | null = null;
    let recipientFirstName: string | null = null;

    try {
      const user = await prisma.user.findUnique({
        where: { id: presentation.userId },
        select: {
          firstName: true,
          tenantMemberships: {
            where: presentation.invitationTenantId
              ? { tenantId: presentation.invitationTenantId }
              : undefined,
            take: 1,
            select: {
              tenant: { select: { name: true } },
            },
          },
        },
      });
      if (user) {
        recipientFirstName = user.firstName;
        tenantName = user.tenantMemberships[0]?.tenant.name ?? null;
      }
    } catch {
      // Non-fatal — invitation page will fall back to generic text.
    }

    return NextResponse.json(
      {
        valid: true,
        isInvitation: true,
        isExistingUser: presentation.isExistingUser,
        tenantName,
        recipientFirstName,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[reset-password:validate]", {
      surface: "resetPasswordValidate",
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ valid: false, issue: "invalid" as const }, { status: 200 });
  }
}
