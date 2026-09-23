import type { PersonalContext } from "@/lib/dashboard/personal-context/types";
import type { QuickAccessCatalogEntry } from "./types";
import { QUICK_ACCESS_MAX_PINS } from "./constants";

const NAV_BOOST_BY_CONTEXT: Array<{
  when: (ctx: PersonalContext) => boolean;
  navItemKeys: string[];
  boost: number;
}> = [
  {
    when: (ctx) => ctx.teams.length > 0,
    navItemKeys: ["wochenplanner", "matchcenter", "trainingcenter"],
    boost: 25,
  },
  {
    when: (ctx) => ctx.assignments.length > 0 || ctx.orgUnits.length > 0,
    navItemKeys: ["aufgaben", "meetings"],
    boost: 12,
  },
];

function scoreEntry(
  entry: QuickAccessCatalogEntry,
  personalContext: PersonalContext | null,
): number {
  let score = entry.defaultPriority;
  if (!personalContext || entry.kind !== "NAVIGATION" || !entry.navItemKey) {
    return score;
  }
  for (const rule of NAV_BOOST_BY_CONTEXT) {
    if (rule.when(personalContext) && rule.navItemKeys.includes(entry.navItemKey)) {
      score += rule.boost;
    }
  }
  if (entry.navItemKey === "anmeldungen" || entry.navItemKey === "registrierungen") {
    score += 8;
  }
  return score;
}

/**
 * Deterministic default pin order when the user has no stored preference.
 * Context-aware boosts only reorder within the authorized catalog — no persona templates.
 */
export function deriveDefaultQuickAccessKeys(
  catalog: QuickAccessCatalogEntry[],
  personalContext: PersonalContext | null,
): string[] {
  const nav = catalog.filter((e) => e.kind === "NAVIGATION");
  const create = catalog.filter((e) => e.kind === "CREATE_ACTION");

  const rankedNav = [...nav].sort((a, b) => {
    const scoreDiff =
      scoreEntry(b, personalContext) - scoreEntry(a, personalContext);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return a.key.localeCompare(b.key);
  });

  const rankedCreate = [...create].sort((a, b) => a.key.localeCompare(b.key));

  const combined = [...rankedNav.slice(0, 6), ...rankedCreate.slice(0, 2)];
  const deduped: string[] = [];
  for (const entry of combined) {
    if (!deduped.includes(entry.key)) {
      deduped.push(entry.key);
    }
  }

  if (deduped.length < QUICK_ACCESS_MAX_PINS) {
    for (const entry of rankedNav) {
      if (deduped.length >= QUICK_ACCESS_MAX_PINS) {
        break;
      }
      if (!deduped.includes(entry.key)) {
        deduped.push(entry.key);
      }
    }
  }

  return deduped.slice(0, QUICK_ACCESS_MAX_PINS);
}
