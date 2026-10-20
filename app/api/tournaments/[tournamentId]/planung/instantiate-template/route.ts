import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { applyProgrammeTemplateToTournament } from "@/lib/tournament-scheduling/programme-templates/programme-template-service";
import { ProgrammeTemplateApplyError } from "@/lib/tournament-scheduling/programme-templates/programme-template-service";
import { loadTournamentPlanungViewModel } from "@/lib/tournaments/planung/load-tournament-planung.server";
import { TournamentSchedulingError } from "@/lib/tournament-scheduling/errors";

type RouteContext = { params: Promise<{ tournamentId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const tenant = await getActiveTenant();
  const { tournamentId } = await params;
  let body: {
    templateId?: string;
    templateVersion?: number;
    replaceExisting?: boolean;
    expectedRevision?: number;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!body.templateId?.trim()) {
    return NextResponse.json({ error: "templateId is required." }, { status: 400 });
  }

  try {
    const result = await applyProgrammeTemplateToTournament({
      tenantId,
      tournamentId,
      templateId: body.templateId.trim(),
      templateVersion: body.templateVersion,
      replaceExisting: body.replaceExisting ?? false,
      expectedRevision: body.expectedRevision,
    });

    const viewModel = await loadTournamentPlanungViewModel({
      tenantId,
      tournamentId,
      timezone: tenant?.timezone ?? "Europe/Zurich",
      tenantName: tenant?.name ?? null,
      tenantLogoUrl: tenant?.logoUrl ?? null,
    });

    return NextResponse.json({
      viewModel,
      template: {
        id: result.template.id,
        version: result.template.version,
        displayName: result.template.displayName,
        fieldCount: result.template.fields.length,
        roundCount: result.template.rounds.length,
      },
      fixtureCount: result.fixtureCount,
      scheduleRevision: result.revision,
    });
  } catch (err) {
    if (err instanceof ProgrammeTemplateApplyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
    }
    if (err instanceof TournamentSchedulingError && err.code === "SCHEDULE.STALE_VERSION") {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
    }
    throw err;
  }
}
