import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { TournamentNotFoundError } from "@/lib/tournaments/errors";
import { hydrateTournamentPlannerSetupDraft } from "@/lib/tournaments/planung/hydrate-tournament-planner-setup.server";
import { persistTournamentPlannerSetupForExistingTournament } from "@/lib/tournaments/planung/persist-tournament-planner-setup.server";
import { TournamentPlannerSetupNotAllowedError } from "@/lib/tournaments/planung/planner-setup-errors";
import { loadTournamentPlanungViewModel } from "@/lib/tournaments/planung/load-tournament-planung.server";
import { TournamentPlannerNotOwnedByTenantError } from "@/lib/tournament-scheduling/errors";
import type { TournamentComposerPlannerDraft } from "@/lib/tournaments/composer/tournament-composer-planner-types";

type RouteContext = { params: Promise<{ tournamentId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_VIEW, PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const tenant = await getActiveTenant();
  const { tournamentId } = await params;
  const timezone = tenant?.timezone ?? "Europe/Zurich";

  try {
    const setup = await hydrateTournamentPlannerSetupDraft({
      tenantId,
      tournamentId,
      timezone,
    });
    return NextResponse.json({
      payload: setup.payload,
      planner: setup.planner,
      participantCount: setup.participantCount,
      categoryContext: setup.categoryContext,
      defaultMatchDurationMinutes: setup.defaultMatchDurationMinutes,
      tenantClubName: tenant?.name ?? "",
      tenantLogoUrl: tenant?.logoUrl ?? null,
    });
  } catch (err) {
    if (err instanceof TournamentNotFoundError) {
      return NextResponse.json({ error: "Turnier nicht gefunden." }, { status: 404 });
    }
    if (err instanceof TournamentPlannerNotOwnedByTenantError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}

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
  const timezone = tenant?.timezone ?? "Europe/Zurich";

  let body: { planner?: TournamentComposerPlannerDraft } = {};
  try {
    body = (await request.json()) as { planner?: TournamentComposerPlannerDraft };
  } catch {
    body = {};
  }

  if (!body.planner) {
    return NextResponse.json({ error: "Turnierplanung fehlt." }, { status: 400 });
  }

  try {
    const hydrated = await hydrateTournamentPlannerSetupDraft({
      tenantId,
      tournamentId,
      timezone,
    });

    await persistTournamentPlannerSetupForExistingTournament({
      tenantId,
      tournamentId,
      payload: hydrated.payload,
      planner: body.planner,
    });

    const viewModel = await loadTournamentPlanungViewModel({
      tenantId,
      tournamentId,
      timezone,
      tenantName: tenant?.name ?? null,
      tenantLogoUrl: tenant?.logoUrl ?? null,
    });

    return NextResponse.json({ viewModel });
  } catch (err) {
    if (err instanceof TournamentNotFoundError) {
      return NextResponse.json({ error: "Turnier nicht gefunden." }, { status: 404 });
    }
    if (err instanceof TournamentPlannerNotOwnedByTenantError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof TournamentPlannerSetupNotAllowedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof Error && err.message === "Turnierplanung unvollständig.") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
