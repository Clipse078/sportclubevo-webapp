/**
 * Shared auth/context resolution for matchcenter match-squad APIs.
 */

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { resolveMatchSquadEventContext } from "@/lib/match-squad/event-context";
import { resolveMatchSquadAccess, type MatchSquadAccess } from "@/lib/match-squad/auth";
import { MatchSquadError } from "@/lib/match-squad/errors";

export function mapMatchSquadRouteError(error: unknown): NextResponse {
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

export type ResolvedMatchSquadRouteAccess = {
  tenant: { id: string; key: string };
  userId: string;
  access: MatchSquadAccess;
  context: Awaited<ReturnType<typeof resolveMatchSquadEventContext>>;
};

export async function resolveAccessForMatch(
  matchId: string,
): Promise<
  | { ok: true; tenant: { id: string; key: string }; userId: string; access: MatchSquadAccess; context: ResolvedMatchSquadRouteAccess["context"] }
  | { ok: false; response: NextResponse }
> {
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
    return { ok: false as const, response: mapMatchSquadRouteError(error) };
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
