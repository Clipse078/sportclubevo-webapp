import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  updatePlanungFixtureHomeAwayRelevance,
  updatePlanungOperationalTiming,
} from "@/lib/tournaments/planung/planung-operational-config-service";
import { loadTournamentPlanungViewModel } from "@/lib/tournaments/planung/load-tournament-planung.server";
import { TournamentSchedulingError } from "@/lib/tournament-scheduling/errors";
import { prisma } from "@/lib/db/prisma";

type RouteContext = { params: Promise<{ tournamentId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
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
    matchDurationMinutes?: number;
    transitionMinutes?: number;
    fixtureHomeAwayRelevance?: "ON" | "OFF";
  };

  if (!body.scheduleVersionId) {
    return NextResponse.json({ error: "scheduleVersionId is required." }, { status: 400 });
  }
  if (body.matchDurationMinutes == null || body.transitionMinutes == null) {
    return NextResponse.json(
      { error: "matchDurationMinutes and transitionMinutes are required." },
      { status: 400 },
    );
  }

  try {
    const previousHomeAway = await prisma.tournamentCompetitionConfiguration.findFirst({
      where: { tenantId, eventId: tournamentId },
      select: { fixtureHomeAwayRelevance: true },
    });
    const previousRelevance =
      previousHomeAway?.fixtureHomeAwayRelevance === "ON" ? "ON" : "OFF";

    await updatePlanungOperationalTiming({
      tenantId,
      tournamentId,
      scheduleVersionId: body.scheduleVersionId,
      expectedRevision: body.expectedRevision,
      matchDurationMinutes: body.matchDurationMinutes,
      transitionMinutes: body.transitionMinutes,
    });

    let homeAwayChanged = false;
    if (body.fixtureHomeAwayRelevance != null) {
      if (body.fixtureHomeAwayRelevance !== "ON" && body.fixtureHomeAwayRelevance !== "OFF") {
        return NextResponse.json(
          { error: "fixtureHomeAwayRelevance must be ON or OFF." },
          { status: 400 },
        );
      }
      homeAwayChanged = body.fixtureHomeAwayRelevance !== previousRelevance;
      if (homeAwayChanged) {
        await updatePlanungFixtureHomeAwayRelevance({
          tenantId,
          tournamentId,
          fixtureHomeAwayRelevance: body.fixtureHomeAwayRelevance,
        });
      }
    }

    const viewModel = await loadTournamentPlanungViewModel({
      tenantId,
      tournamentId,
      timezone: tenant?.timezone ?? "Europe/Zurich",
      tenantName: tenant?.name ?? null,
      tenantLogoUrl: tenant?.logoUrl ?? null,
      scheduleConsistencyOverride: homeAwayChanged ? "NEEDS_REGENERATION" : undefined,
    });

    return NextResponse.json({ viewModel });
  } catch (err) {
    if (err instanceof TournamentSchedulingError) {
      if (err.code === "SCHEDULE.STALE_VERSION") {
        return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
      }
      if (err.code === "TOURNAMENT_GENERATION_INVALID") {
        return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
      }
    }
    throw err;
  }
}
