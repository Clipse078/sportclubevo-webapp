/**
 * GET/PUT /api/matchcenter/[matchId]/match-squad
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01A
 */

import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { resolveMatchSquadEventContext } from "@/lib/match-squad/event-context";
import { resolveMatchSquadAccess, assertMatchSquadMutationAllowed } from "@/lib/match-squad/auth";
import {
  buildMatchSquadViewModel,
  setMatchSquadMembers,
} from "@/lib/match-squad/match-squad-service";
import { MatchSquadError } from "@/lib/match-squad/errors";

type Params = { params: Promise<{ matchId: string }> };

function mapError(error: unknown): NextResponse {
  if (error instanceof MatchSquadError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.httpStatus });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    console.error("[match-squad] required table missing (migration pending)", error);
    return NextResponse.json(
      {
        error:
          "Das Aufgebot-Schema ist auf dieser Umgebung noch nicht bereit. Bitte wenden Sie sich an den Support.",
        code: "SCHEMA_NOT_READY",
      },
      { status: 503 },
    );
  }
  console.error("[match-squad]", error);
  return NextResponse.json(
    { error: "Aufgebot konnte nicht verarbeitet werden.", code: "INTERNAL" },
    { status: 500 },
  );
}

async function resolveAccessForMatch(matchId: string) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const tenant = await getActiveTenant();
  if (!tenant) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Tenant context required" }, { status: 400 }),
    };
  }

  const userId = session.user.effectiveUserId ?? session.user.id;
  let context;
  try {
    context = await resolveMatchSquadEventContext(tenant.id, matchId);
  } catch (error) {
    return { ok: false as const, response: mapError(error) };
  }

  const access = await resolveMatchSquadAccess({
    userId,
    tenantId: tenant.id,
    tenantKey: tenant.key,
    teamId: context.teamId,
    teamSeasonId: context.teamSeasonId,
  });

  if (!access) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Spiel nicht gefunden." }, { status: 404 }),
    };
  }

  return { ok: true as const, tenant, userId, access, context };
}

export async function GET(_request: NextRequest, { params }: Params) {
  const viewAuth = await requireApiAnyPermission([
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.MATCHES_DELETE,
  ]);
  if (!viewAuth.ok) {
    return NextResponse.json({ error: viewAuth.error }, { status: viewAuth.status });
  }

  const { matchId } = await params;
  const resolved = await resolveAccessForMatch(matchId);
  if (!resolved.ok) return resolved.response;

  try {
    const squad = await buildMatchSquadViewModel(resolved.tenant.id, matchId);
    return NextResponse.json({
      ...squad,
      canEdit: resolved.access.canEdit && squad.editable,
    });
  } catch (error) {
    return mapError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { matchId } = await params;
  const resolved = await resolveAccessForMatch(matchId);
  if (!resolved.ok) return resolved.response;

  try {
    assertMatchSquadMutationAllowed(resolved.access);
  } catch (error) {
    return mapError(error);
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.selectedPersonIds)) {
    return NextResponse.json(
      { error: "selectedPersonIds (Array) ist erforderlich." },
      { status: 400 },
    );
  }

  try {
    const squad = await setMatchSquadMembers({
      tenantId: resolved.tenant.id,
      eventId: matchId,
      actorUserId: resolved.userId,
      desiredPersonIds: body.selectedPersonIds as string[],
      expectedVersion:
        typeof body.expectedVersion === "string" ? body.expectedVersion : null,
    });
    return NextResponse.json({
      ...squad,
      canEdit: resolved.access.canEdit && squad.editable,
    });
  } catch (error) {
    if (error instanceof MatchSquadError && error.code === "CONFLICT") {
      const latest = await buildMatchSquadViewModel(resolved.tenant.id, matchId);
      return NextResponse.json(
        { error: error.message, code: error.code, squad: latest },
        { status: 409 },
      );
    }
    return mapError(error);
  }
}
