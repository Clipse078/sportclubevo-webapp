import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { createPlanungOperationalBreak } from "@/lib/tournaments/planung/planung-operational-config-service";
import { applyPlanungLiveScheduleReconcile } from "@/lib/tournaments/planung/planung-live-schedule-reconcile.server";
import { TournamentSchedulingError } from "@/lib/tournament-scheduling/errors";
import { planungStaleScheduleVersionResponse } from "@/lib/tournaments/planung/planung-stale-schedule-response.server";

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
  const body = (await request.json()) as {
    scheduleVersionId?: string;
    expectedRevision?: number;
    label?: string | null;
    startLocalTime?: string;
    durationMinutes?: number;
    scope?: "ALL_PITCHES" | "SELECTED_PITCHES";
    tournamentPitchIds?: string[];
  };

  if (!body.startLocalTime || body.durationMinutes == null) {
    return NextResponse.json(
      { error: "startLocalTime and durationMinutes are required." },
      { status: 400 },
    );
  }
  if (!body.scheduleVersionId) {
    return NextResponse.json({ error: "scheduleVersionId is required." }, { status: 400 });
  }

  try {
    await createPlanungOperationalBreak({
      tenantId,
      tournamentId,
      draft: {
        label: body.label,
        startLocalTime: body.startLocalTime,
        durationMinutes: body.durationMinutes,
        scope: body.scope ?? "ALL_PITCHES",
        tournamentPitchIds: body.tournamentPitchIds,
      },
    });

    const result = await applyPlanungLiveScheduleReconcile({
      tenantId,
      tournamentId,
      scheduleVersionId: body.scheduleVersionId,
      expectedRevision: body.expectedRevision,
      timezone: tenant?.timezone ?? "Europe/Zurich",
      tenantName: tenant?.name ?? null,
      tenantLogoUrl: tenant?.logoUrl ?? null,
    });

    return NextResponse.json({ viewModel: result.viewModel });
  } catch (err) {
    if (err instanceof TournamentSchedulingError) {
      if (err.code === "SCHEDULE.STALE_VERSION") {
        return planungStaleScheduleVersionResponse({
          tenantId,
          tournamentId,
          timezone: tenant?.timezone ?? "Europe/Zurich",
          tenantName: tenant?.name ?? null,
          tenantLogoUrl: tenant?.logoUrl ?? null,
          code: err.code,
        });
      }
      if (err.code === "TOURNAMENT_GENERATION_INVALID") {
        return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
      }
    }
    if (err instanceof Error && err.message.includes("break")) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
