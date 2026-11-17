/**
 * GET /api/admin/people-access/invite/policy
 *
 * Canonical server-side live-send policy for the standard People & Access invite wizard.
 */

import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolveVlInvitationSendMode } from "@/lib/admin/vl-onboarding/vl-invitation-send-policy";

export async function GET() {
  const access = await requireApiPermission(PERMISSIONS.USERS_INVITE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  return NextResponse.json({
    sendMode: resolveVlInvitationSendMode(),
  });
}