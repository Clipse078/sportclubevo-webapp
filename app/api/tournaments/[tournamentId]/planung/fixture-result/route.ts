import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  clearTournamentFixtureResult,
  recordTournamentFixtureResult,
  TournamentFixtureResultInvalidError,
  TournamentFixtureResultProgressionBlockedError,
  TournamentFixtureResultStaleError,
} from "@/lib/tournament-scheduling/competition-progression/fixture-result-service";
import { loadTournamentPlanungViewModel } from "@/lib/tournaments/planung/load-tournament-planung.server";
import { TournamentFixtureNotFoundError, TournamentSchedulingError } from "@/lib/tournament-scheduling/errors";
import { TournamentPlannerNotOwnedError } from "@/lib/tournament-scheduling/partial-regeneration-service";

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
    action?: "record" | "clear";
    fixtureId?: string;
    expectedRevision?: number | null;
    scoreSideA?: number;
    scoreSideB?: number;
    explicitWinnerParticipantId?: string | null;
  };

  if (!body.fixtureId || body.action == null) {
    return NextResponse.json(
      { error: "fixtureId and action (record|clear) are required." },
      { status: 400 },
    );
  }

  try {
    let revision: number;
    if (body.action === "clear") {
      if (body.expectedRevision == null) {
        return NextResponse.json({ error: "expectedRevision is required to clear." }, { status: 400 });
      }
      const result = await clearTournamentFixtureResult({
        tenantId,
        tournamentId,
        fixtureId: body.fixtureId,
        expectedRevision: body.expectedRevision,
        actorUserId: access.session.user.id,
      });
      revision = result.revision;
    } else {
      if (body.scoreSideA == null || body.scoreSideB == null) {
        return NextResponse.json(
          { error: "scoreSideA and scoreSideB are required to record a result." },
          { status: 400 },
        );
      }
      const result = await recordTournamentFixtureResult({
        tenantId,
        tournamentId,
        fixtureId: body.fixtureId,
        expectedRevision: body.expectedRevision ?? null,
        scoreSideA: body.scoreSideA,
        scoreSideB: body.scoreSideB,
        explicitWinnerParticipantId: body.explicitWinnerParticipantId,
        actorUserId: access.session.user.id,
      });
      revision = result.revision;
    }

    const viewModel = await loadTournamentPlanungViewModel({
      tenantId,
      tournamentId,
      timezone: tenant?.timezone ?? "Europe/Zurich",
      tenantName: tenant?.name ?? null,
      tenantLogoUrl: tenant?.logoUrl ?? null,
    });

    return NextResponse.json({ viewModel, revision });
  } catch (err) {
    if (err instanceof TournamentPlannerNotOwnedError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
    }
    if (err instanceof TournamentFixtureResultStaleError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
    }
    if (err instanceof TournamentFixtureResultProgressionBlockedError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          completedDownstreamFixtureIds: err.completedDownstreamFixtureIds,
        },
        { status: 422 },
      );
    }
    if (err instanceof TournamentFixtureResultInvalidError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
    }
    if (err instanceof TournamentFixtureNotFoundError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 404 });
    }
    if (err instanceof TournamentSchedulingError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
    }
    throw err;
  }
}
