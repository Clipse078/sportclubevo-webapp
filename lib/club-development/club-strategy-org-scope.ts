/**
 * Explicit Org-Einheit scope for club strategy create/update (PR #1017).
 * Gesamtverein is a deliberate selection — empty scope is invalid.
 */

export const CD_CLUB_STRATEGY_SCOPE_GESAMTVEREIN = "__gesamtverein__" as const;

export const CD_CLUB_STRATEGY_ORG_SCOPE_REQUIRED_MESSAGE =
  "Wählen Sie mindestens eine Org-Einheit aus." as const;

export type ParsedClubStrategyOrgScope =
  | { kind: "invalid" }
  | { kind: "club_wide" }
  | { kind: "org_units"; orgUnitIds: string[] };

export function defaultClubStrategyOrgScopeSelection(): string[] {
  return [CD_CLUB_STRATEGY_SCOPE_GESAMTVEREIN];
}

export function isGesamtvereinScopeToken(id: string): boolean {
  return id === CD_CLUB_STRATEGY_SCOPE_GESAMTVEREIN;
}

export function parseClubStrategyOrgScopeSelection(selected: readonly string[]): ParsedClubStrategyOrgScope {
  const tokens = [...new Set(selected.map((id) => id.trim()).filter(Boolean))];
  if (tokens.length === 0) return { kind: "invalid" };
  const hasClub = tokens.some(isGesamtvereinScopeToken);
  const orgUnitIds = tokens.filter((id) => !isGesamtvereinScopeToken(id));
  if (hasClub && orgUnitIds.length > 0) return { kind: "invalid" };
  if (hasClub) return { kind: "club_wide" };
  if (orgUnitIds.length > 0) return { kind: "org_units", orgUnitIds };
  return { kind: "invalid" };
}

export function mergeOrgUnitPickerSelection(
  _previous: readonly string[],
  pickerOrgUnitIds: readonly string[],
): string[] {
  const orgUnitIds = [...new Set(pickerOrgUnitIds.map((id) => id.trim()).filter(Boolean))];
  return orgUnitIds;
}

export function selectGesamtvereinScope(): string[] {
  return [CD_CLUB_STRATEGY_SCOPE_GESAMTVEREIN];
}

export function removeScopeToken(selected: readonly string[], token: string): string[] {
  return selected.filter((id) => id !== token);
}

export type CreateClubStrategyScopePayload =
  | { scopeClubWide: true; orgUnitIds?: undefined }
  | { scopeClubWide?: false; orgUnitIds: string[] };

export function toCreateClubStrategyScopePayload(
  selected: readonly string[],
): CreateClubStrategyScopePayload | null {
  const parsed = parseClubStrategyOrgScopeSelection(selected);
  if (parsed.kind === "club_wide") return { scopeClubWide: true };
  if (parsed.kind === "org_units") return { orgUnitIds: parsed.orgUnitIds };
  return null;
}

export function parseCreateClubStrategyScopeInput(input: {
  scopeClubWide?: unknown;
  orgUnitIds?: unknown;
}): ParsedClubStrategyOrgScope {
  const orgUnitIds = Array.isArray(input.orgUnitIds)
    ? input.orgUnitIds
        .filter((v): v is string => typeof v === "string")
        .map((id) => id.trim())
        .filter(Boolean)
    : [];
  const scopeClubWide = input.scopeClubWide === true;

  if (scopeClubWide && orgUnitIds.length > 0) return { kind: "invalid" };
  if (scopeClubWide) return { kind: "club_wide" };
  if (orgUnitIds.length > 0) return { kind: "org_units", orgUnitIds: [...new Set(orgUnitIds)] };
  return { kind: "invalid" };
}