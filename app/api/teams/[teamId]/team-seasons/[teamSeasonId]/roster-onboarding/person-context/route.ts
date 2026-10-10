import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { loadRosterPersonOnboardingContext } from "@/lib/teams/roster-onboarding-queries";

type Context = {
  params: Promise<{ teamId: string; teamSeasonId: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const access = await requireApiPermission(PERMISSIONS.TEAMS_VIEW);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Kein Mandanten-Kontext." }, { status: 403 });
  }

  const personId = request.nextUrl.searchParams.get("personId")?.trim() ?? "";
  if (!personId) {
    return NextResponse.json({ error: "personId fehlt." }, { status: 400 });
  }

  const { teamId, teamSeasonId } = await context.params;

  const result = await loadRosterPersonOnboardingContext({
    tenantId,
    teamId,
    teamSeasonId,
    personId,
  });

  if (!result) {
    return NextResponse.json({ error: "Person nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(result);
}
