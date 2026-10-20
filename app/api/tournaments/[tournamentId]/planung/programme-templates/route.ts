import { NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildPlanungProgrammeTemplatePresentation } from "@/lib/tournament-scheduling/programme-templates/planung-template-presentation";
import { prisma } from "@/lib/db/prisma";

type RouteContext = { params: Promise<{ tournamentId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { tournamentId } = await params;
  const participantCount = await prisma.tournamentParticipant.count({
    where: { tenantId, eventId: tournamentId },
  });

  const presentation = buildPlanungProgrammeTemplatePresentation({ participantCount });
  return NextResponse.json({ participantCount, ...presentation });
}
