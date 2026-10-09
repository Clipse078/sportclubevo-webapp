/**
 * SCE-COLLAB-01B — affected SCE team for match contextual communication.
 */

import { prisma } from "@/lib/db/prisma";
import { dedupeTenantTeamIds } from "@/lib/collaboration/shared/operational-audience";
import type { MatchActivitySnapshot } from "@/lib/collaboration/match/match-activity-snapshot";

export type ResolvedMatchAudience = {
  primaryTeamId: string;
  teamIds: string[];
  teamName: string;
  teamNamesLabel: string | null;
};

export async function resolveMatchAudienceContext(input: {
  tenantId: string;
  snapshot: MatchActivitySnapshot;
}): Promise<ResolvedMatchAudience | null> {
  const candidateIds = dedupeTenantTeamIds([input.snapshot.teamId]);

  if (candidateIds.length === 0) {
    const mapping = await prisma.matchExternalMapping.findFirst({
      where: { tenantId: input.tenantId, eventId: input.snapshot.matchId },
      select: {
        homeTeamId: true,
        awayTeamId: true,
        homeTeam: { select: { id: true, name: true, tenantId: true } },
        awayTeam: { select: { id: true, name: true, tenantId: true } },
      },
    });
    if (mapping) {
      for (const side of [mapping.homeTeam, mapping.awayTeam]) {
        if (side && side.tenantId === input.tenantId) {
          candidateIds.push(side.id);
        }
      }
    }
  }

  const teamIds = dedupeTenantTeamIds(candidateIds);
  if (teamIds.length === 0) return null;

  const teams = await prisma.team.findMany({
    where: { tenantId: input.tenantId, id: { in: teamIds } },
    select: { id: true, name: true },
  });
  if (teams.length === 0) return null;

  const byId = new Map(teams.map((t) => [t.id, t.name]));
  const orderedNames = teamIds.map((id) => byId.get(id)).filter(Boolean) as string[];
  const primaryTeamId = teamIds[0]!;
  const teamName = orderedNames[0] ?? input.snapshot.teamName ?? "Team";
  const teamNamesLabel =
    orderedNames.length > 1 ? orderedNames.join(", ") : orderedNames[0] ?? teamName;

  return {
    primaryTeamId,
    teamIds,
    teamName,
    teamNamesLabel,
  };
}
