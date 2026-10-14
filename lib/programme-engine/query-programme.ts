import { applyProgrammeFilters } from "./apply-filters";
import { loadProgrammeSourceItems } from "./load-programme-sources";
import { buildProgrammeProjectionActor } from "./programme-actor";
import { resolveProgrammeRange } from "./programme-range";
import { sortProgrammeItems } from "./programme-sort";
import type { ProgrammeQueryInput, ProgrammeQueryResult } from "./types";

/**
 * Canonical scope-aware Programme Engine entry point.
 * ProgrammeQuery(scope, filters) → ProgrammeItem[]
 */
export async function queryProgramme(input: ProgrammeQueryInput): Promise<ProgrammeQueryResult> {
  const range = resolveProgrammeRange({
    timeZone: input.timeZone,
    now: input.now,
    temporal: input.temporal,
    from: input.from,
    to: input.to,
  });

  const actor = buildProgrammeProjectionActor({
    userId: input.userId,
    tenantId: input.tenantId,
    permissionKeys: input.permissionKeys,
  });

  const tenantClubName = input.tenantClubName?.trim() || "Verein";

  const rawItems = await loadProgrammeSourceItems(input.scope, {
    tenantId: input.tenantId,
    timeZone: input.timeZone,
    rangeStart: range.rangeStart,
    rangeEnd: range.rangeEnd,
    actor,
    tenantClubName,
    tenantLogoUrl: input.tenantLogoUrl,
  });

  const filtered = applyProgrammeFilters(rawItems, input.filters);
  const items = sortProgrammeItems(filtered);

  return {
    items,
    range,
    scope: input.scope,
  };
}
