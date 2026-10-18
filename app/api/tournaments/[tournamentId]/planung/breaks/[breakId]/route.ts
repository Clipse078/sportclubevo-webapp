import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  deletePlanungOperationalBreak,
  updatePlanungOperationalBreak,
} from "@/lib/tournaments/planung/planung-operational-config-service";
import { applyPlanungLiveScheduleReconcile } from "@/lib/tournaments/planung/planung-live-schedule-reconcile.server";
import { TournamentSchedulingError } from "@/lib/tournament-scheduling/errors";

type RouteContext = { params: Promise<{ tournamentId: string; breakId: string }> };

async function reconcileAfterBreakChange(
  tenantId: string,
  tournamentId: string,
  scheduleVersionId: string,
  expectedRevision?: number,
) {
  const tenant = await getActiveTenant();
  return applyPlanungLiveScheduleReconcile({
    tenantId,
    tournamentId,
    scheduleVersionId,
    expectedRevision,
    timezone: tenant?.timezone ?? "Europe/Zurich",
    tenantName: tenant?.name ?? null,
    tenantLogoUrl: tenant?.logoUrl ?? null,
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { tournamentId, breakId } = await params;
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
    await updatePlanungOperationalBreak({
      tenantId,
      tournamentId,
      breakId,
      draft: {
        label: body.label,
        startLocalTime: body.startLocalTime,
        durationMinutes: body.durationMinutes,
        scope: body.scope ?? "ALL_PITCHES",
        tournamentPitchIds: body.tournamentPitchIds,
      },
    });

    const result = await reconcileAfterBreakChange(
      tenantId,
      tournamentId,
      body.scheduleVersionId,
      body.expectedRevision,
    );
    return NextResponse.json({ viewModel: result.viewModel });
  } catch (err) {
    if (err instanceof TournamentSchedulingError) {
      if (err.code === "SCHEDULE.STALE_VERSION") {
        return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
      }
      if (err.code === "TOURNAMENT_GENERATION_INVALID") {
        return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
      }
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { tournamentId, breakId } = await params;
  let body: { scheduleVersionId?: string; expectedRevision?: number } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!body.scheduleVersionId) {
    return NextResponse.json({ error: "scheduleVersionId is required." }, { status: 400 });
  }

  try {
    await deletePlanungOperationalBreak({ tenantId, tournamentId, breakId });
    const result = await reconcileAfterBreakChange(
      tenantId,
      tournamentId,
      body.scheduleVersionId,
      body.expectedRevision,
    );
    return NextResponse.json({ viewModel: result.viewModel });
  } catch (err) {
    if (err instanceof TournamentSchedulingError && err.code === "SCHEDULE.STALE_VERSION") {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
