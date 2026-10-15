import type { ClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import type { SceMatchFixtureIdentity } from "@/lib/sporting-activity-presentation/canonical/types";

export type TeamScopeMatchSide = "HOME" | "AWAY";

export type TeamScopeMatchOpponentResolution = {
  currentSide: TeamScopeMatchSide;
  opponent: ClubIdentity;
};

function normalizeScopeTeamId(scopeTeamId: string | null | undefined): string | null {
  const trimmed = scopeTeamId?.trim();
  return trimmed || null;
}

function sideMatchesScope(side: ClubIdentity, scopeTeamId: string): boolean {
  const scope = scopeTeamId.trim();
  if (side.id?.trim() === scope) return true;
  return false;
}

/**
 * Resolves the non-scope participant for TEAM programme/calendar MICRO identity.
 * Uses canonical club identity ids only — never display-string heuristics.
 */
export function resolveTeamScopeMatchOpponent(
  fixture: SceMatchFixtureIdentity,
  scopeTeamId: string | null | undefined,
): TeamScopeMatchOpponentResolution | null {
  const scope = normalizeScopeTeamId(scopeTeamId);
  if (!scope) return null;

  if (sideMatchesScope(fixture.home, scope)) {
    return { currentSide: "HOME", opponent: fixture.away };
  }
  if (sideMatchesScope(fixture.away, scope)) {
    return { currentSide: "AWAY", opponent: fixture.home };
  }
  return null;
}

export function formatTeamScopeMatchMicroIdentityLabel(opponent: ClubIdentity): string {
  return opponent.displayName.trim();
}

export function formatPersonalScopeMatchMicroIdentityLabel(
  fixture: SceMatchFixtureIdentity,
): string {
  const home = fixture.home.displayName.trim();
  const away = fixture.away.displayName.trim();
  if (home && away) return `${home} – ${away}`;
  return home || away || "Spiel";
}

export function formatProgrammeMatchMicroIdentityFallback(
  fixture: SceMatchFixtureIdentity,
): string {
  return formatPersonalScopeMatchMicroIdentityLabel(fixture);
}
