import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPersonProfileByUserIdCached } from "@/lib/server/request-cache";
import { resolveAccountIdentityName } from "@/lib/people/identity";
import { getActiveTenant } from "@/lib/tenants/active-tenant";

export const dynamic = "force-dynamic";

/**
 * Lightweight impersonation safety chrome — always reflects live JWT/session state
 * (used after client navigations where the admin layout RSC tree may be stale).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ isImpersonating: false }, { status: 401 });
  }

  if (!session.user.isImpersonating) {
    return NextResponse.json({ isImpersonating: false });
  }

  const [linkedPersonProfile, tenantCtx] = await Promise.all([
    getPersonProfileByUserIdCached(session.user.id),
    getActiveTenant(),
  ]);

  const shellIdentity = resolveAccountIdentityName({
    linkedPerson: linkedPersonProfile,
    sessionFirstName: session.user.firstName,
    sessionLastName: session.user.lastName,
    tenantName: tenantCtx?.name,
  });

  const effectiveDisplayName =
    `${shellIdentity.firstName} ${shellIdentity.lastName}`.trim() || session.user.email;

  const actorDisplayName =
    session.user.actorName?.trim() ||
    session.user.actorEmail ||
    "Administrator";

  return NextResponse.json({
    isImpersonating: true,
    effectiveDisplayName,
    actorDisplayName,
    effectiveUserId: session.user.id,
    actorUserId: session.user.actorUserId ?? null,
  });
}
