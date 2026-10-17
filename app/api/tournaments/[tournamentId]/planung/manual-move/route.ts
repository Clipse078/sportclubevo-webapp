import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  applyTournamentManualAssignment,
  validateTournamentManualAssignmentForInput,
} from "@/lib/tournament-scheduling/manual-assignment-service";
import { primaryManualAssignmentUserMessage } from "@/lib/tournament-scheduling/manual-assignment";
import { loadTournamentPlanungViewModel } from "@/lib/tournaments/planung/load-tournament-planung.server";
import {
  TournamentManualAssignmentInvalidError,
  TournamentSchedulingError,
} from "@/lib/tournament-scheduling/errors";
import type { TournamentManualAssignmentInput } from "@/lib/tournament-scheduling/manual-assignment";

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
    fixtureId?: string;
    expectedRevision?: number;
    targetTournamentPitchId?: string;
    targetStartAt?: string;
    validateOnly?: boolean;
  };

  if (
    !body.scheduleVersionId ||
    !body.fixtureId ||
    body.expectedRevision === undefined ||
    !body.targetTournamentPitchId ||
    !body.targetStartAt
  ) {
    return NextResponse.json(
      {
        error:
          "scheduleVersionId, fixtureId, expectedRevision, targetTournamentPitchId, and targetStartAt are required.",
      },
      { status: 400 },
    );
  }

  const input: TournamentManualAssignmentInput = {
    tenantId,
    tournamentId,
    scheduleVersionId: body.scheduleVersionId,
    fixtureId: body.fixtureId,
    expectedRevision: body.expectedRevision,
    targetTournamentPitchId: body.targetTournamentPitchId,
    targetStartAt: body.targetStartAt,
  };

  try {
    if (body.validateOnly) {
      const validation = await validateTournamentManualAssignmentForInput(input);
      if (!validation.ok) {
        return NextResponse.json(
          {
            ok: false,
            diagnostics: validation.diagnostics,
            error: primaryManualAssignmentUserMessage(validation.diagnostics),
          },
          { status: 422 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    const result = await applyTournamentManualAssignment(input, {
      timezone: tenant?.timezone ?? "Europe/Zurich",
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
      revision: result.revision,
      userMessage: result.userMessage,
    });
  } catch (err) {
    if (err instanceof TournamentManualAssignmentInvalidError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          diagnostics: err.diagnostics,
        },
        { status: 422 },
      );
    }
    if (err instanceof TournamentSchedulingError && err.code === "SCHEDULE.STALE_VERSION") {
      return NextResponse.json(
        {
          error: "Der Spielplan wurde inzwischen geändert. Bitte aktualisiere die Planung.",
          code: err.code,
        },
        { status: 409 },
      );
    }
    if (err instanceof TournamentSchedulingError && err.code === "TOURNAMENT_PLANNER_NOT_OWNED_BY_TENANT") {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
    }
    throw err;
  }
}
