/**
 * Auth/context resolution for tournamentcenter activity-squad APIs.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { resolveTournamentSquadEventContext } from "@/lib/match-squad/tournament-squad-event-context";
import { resolveMatchSquadAccess, type MatchSquadAccess } from "@/lib/match-squad/auth";
import { mapMatchSquadRouteError } from "@/lib/match-squad/match-squad-route-access";

export async function resolveAccessForTournamentSquad(
  tournamentId: string,
): Promise<
  | {
      ok: true;
      tenant: { id: string; key: string };
      userId: string;
      access: MatchSquadAccess;
      context: Awaited<ReturnType<typeof resolveTournamentSquadEventContext>>;
    }
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
    context = await resolveTournamentSquadEventContext(tenant.id, tournamentId);
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
      response: NextResponse.json({ error: "Turnier nicht gefunden." }, { status: 404 }),
    };
  }

  return { ok: true as const, tenant, userId, access, context };
}
