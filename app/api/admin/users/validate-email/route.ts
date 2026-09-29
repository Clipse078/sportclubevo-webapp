/**
 * POST /api/admin/users/validate-email
 *
 * Authoritative invitation email validation (syntax, domain plausibility, MX).
 * Does not mutate data or send mail.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { validateInvitationEmailForServer } from "@/lib/admin/people-access/email-validation";
import { resolveMxRecords } from "@/lib/admin/people-access/email-dns";

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(PERMISSIONS.USERS_INVITE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Anfrage-Inhalt." }, { status: 400 });
  }

  const email = typeof (body as { email?: unknown })?.email === "string" ? (body as { email: string }).email : "";
  if (!email.trim()) {
    return NextResponse.json(
      { ok: false, code: "INVALID_EMAIL_FORMAT", error: "E-Mail ist erforderlich." },
      { status: 400 },
    );
  }

  const result = await validateInvitationEmailForServer(email, resolveMxRecords);

  if (!result.ok) {
    const status =
      result.code === "EMAIL_DOMAIN_CHECK_TEMPORARY_FAILURE"
        ? 503
        : 400;
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        error: result.message,
        suggestion: result.suggestion,
        normalized: result.normalized,
      },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    code: result.code,
    normalized: result.normalized,
  });
}
