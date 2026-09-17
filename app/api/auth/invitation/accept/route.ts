/**
 * POST /api/auth/invitation/accept
 *
 * Consumes an invitation token for a user who already has an active
 * SportClubEvo account (lastLoginAt is set). This path does NOT update the
 * user's password — it only marks the invitation token as used so the
 * link cannot be replayed.
 *
 * This is the "existing global User" acceptance path. The TenantMembership
 * and Person link were already created when the invitation was issued; this
 * endpoint simply closes the invitation lifecycle.
 *
 * HTTP status:
 *   200  — { success: true }
 *   400  — missing/invalid/expired/already-used token, or token belongs to
 *           a new (not-yet-activated) user (must use the password-setup path)
 *   429  — rate limited
 *   500  — unexpected internal error
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { consumeExistingUserInvitationToken } from "@/lib/auth/password-reset";
import { activateInvitationMembership } from "@/lib/users/mutations";
import { getClientIp } from "@/lib/security/client-ip";
import {
  AUTH_SECURITY_MESSAGES,
  checkApplicationRateLimit,
} from "@/lib/security/abuse-policy";
import { createRateLimitResponse } from "@/lib/security/rate-limit-response";
import { logSecurityEvent } from "@/lib/security/security-events";

function invalidInvitationResponse() {
  return NextResponse.json(
    { error: AUTH_SECURITY_MESSAGES.invalidInvitationLink },
    { status: 400 },
  );
}

export async function POST(req: NextRequest) {
  const rateCheck = checkApplicationRateLimit("invitationAccept", getClientIp(req));
  if (!rateCheck.allowed) {
    logSecurityEvent("AUTH_RATE_LIMITED", { surface: "invitationAccept" });
    return createRateLimitResponse(rateCheck.retryAfterMs);
  }

  let token: string;
  try {
    const body = await req.json();
    token = typeof body?.token === "string" ? body.token.trim() : "";
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (!token) {
    return invalidInvitationResponse();
  }

  let consumed: Awaited<
    ReturnType<typeof consumeExistingUserInvitationToken>
  > = null;
  try {
    consumed = await consumeExistingUserInvitationToken(prisma, token);
  } catch (err) {
    console.error("[invitation/accept] unexpected error");
    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
  if (!consumed) {
    return invalidInvitationResponse();
  }

  // Activate exactly the membership for the invitation's tenant.
  // Non-fatal — token is already consumed; activation failure can be retried.
  if (consumed.invitationTenantId) {
    await activateInvitationMembership(consumed.userId, consumed.invitationTenantId).catch(
      () => {
        console.error("[invitation/accept] membership activation failed");
      },
    );
  }

  return NextResponse.json({ success: true });
}
