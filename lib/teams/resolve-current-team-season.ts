/**
 * SCE-PEOPLE-TEAM-ONBOARDING-01A — DB-backed current TeamSeason resolution.
 *
 * Wraps {@link pickCurrentTeamSeason} / {@link currentTeamSeasonWhere} with tenant-safe
 * Team loading. Used by onboarding services and future 01B UX ("add to F2").
 */

import { prisma } from "@/lib/db/prisma";
import type { TeamSeasonStatus } from "@prisma/client";
import { pickCurrentTeamSeason } from "@/lib/teams/current-season";

export type ResolvedCurrentTeamSeason = {
  id: string;
  teamId: string;
  status: TeamSeasonStatus;
  season: {
    id: string;
    key: string;
    name: string;
    isActive: boolean;
    startDate: Date;
  };
};

export type ResolveCurrentTeamSeasonErrorCode =
  | "TEAM_NOT_FOUND"
  | "TEAM_TENANT_MISMATCH"
  | "NO_CURRENT_TEAM_SEASON"
  | "AMBIGUOUS_CURRENT_TEAM_SEASON";

export type ResolveCurrentTeamSeasonResult =
  | { ok: true; teamSeason: ResolvedCurrentTeamSeason }
  | { ok: false; code: ResolveCurrentTeamSeasonErrorCode; message: string };

/**
 * Resolves the canonical current TeamSeason for a Team within a tenant.
 * Never substitutes a stale season when the canonical season has no row.
 */
export async function resolveCanonicalTeamSeasonForTeam(input: {
  tenantId: string;
  teamId: string;
  explicitSeasonKey?: string | null;
}): Promise<ResolveCurrentTeamSeasonResult> {
  const team = await prisma.team.findUnique({
    where: { id: input.teamId },
    select: {
      id: true,
      tenantId: true,
      teamSeasons: {
        select: {
          id: true,
          teamId: true,
          status: true,
          season: {
            select: {
              id: true,
              key: true,
              name: true,
              isActive: true,
              startDate: true,
            },
          },
        },
      },
    },
  });

  if (!team) {
    return {
      ok: false,
      code: "TEAM_NOT_FOUND",
      message: "Team nicht gefunden.",
    };
  }

  if (team.tenantId !== input.tenantId) {
    return {
      ok: false,
      code: "TEAM_TENANT_MISMATCH",
      message: "Team nicht gefunden.",
    };
  }

  const trimmedKey = input.explicitSeasonKey?.trim();
  if (trimmedKey) {
    const matches = team.teamSeasons.filter((ts) => ts.season.key === trimmedKey);
    if (matches.length === 0) {
      return {
        ok: false,
        code: "NO_CURRENT_TEAM_SEASON",
        message: "Für dieses Team ist in der gewählten Saison keine Team-Saison hinterlegt.",
      };
    }
    if (matches.length > 1) {
      return {
        ok: false,
        code: "AMBIGUOUS_CURRENT_TEAM_SEASON",
        message: "Die Team-Saison-Zuordnung ist mehrdeutig. Bitte eine konkrete Team-Saison auswählen.",
      };
    }
    const ts = matches[0]!;
    return {
      ok: true,
      teamSeason: {
        id: ts.id,
        teamId: ts.teamId,
        status: ts.status,
        season: ts.season,
      },
    };
  }

  const activeSeasonMatches = team.teamSeasons.filter((ts) => ts.season.isActive);
  if (activeSeasonMatches.length > 1) {
    return {
      ok: false,
      code: "AMBIGUOUS_CURRENT_TEAM_SEASON",
      message:
        "Mehrere aktive Saisons sind gleichzeitig als «aktuell» markiert. Bitte eine konkrete Saison auswählen.",
    };
  }

  const picked = pickCurrentTeamSeason(team.teamSeasons, input.explicitSeasonKey);
  if (!picked) {
    return {
      ok: false,
      code: "NO_CURRENT_TEAM_SEASON",
      message: "Für dieses Team ist in der aktuellen Saison keine Team-Saison hinterlegt.",
    };
  }

  return {
    ok: true,
    teamSeason: {
      id: picked.id,
      teamId: picked.teamId,
      status: picked.status,
      season: picked.season,
    },
  };
}
