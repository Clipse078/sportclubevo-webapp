/**
 * SCE-COMM-01 — structural audience selectors (organisation master data).
 *
 * Reuses the same selector families as Requirements/Aufgaben draft audiences.
 * Resolution implementations live in lib/requirements/requirement-audience-resolvers.ts
 * and lib/org/target-group-resolver.ts (saved TargetGroup.ruleJson).
 */

export type StructuralAudienceSelectors = {
  /** Entire tenant organisation (all active persons — resolved at dispatch time). */
  wholeOrganisation?: boolean;
  orgUnitIds?: string[];
  teamIds?: string[];
  roleIds?: string[];
  /** Canonical role keys (TargetGroup rule leaf type `roleKeys`). */
  roleKeys?: string[];
};

export function structuralSelectorsAreEmpty(selectors: StructuralAudienceSelectors): boolean {
  if (selectors.wholeOrganisation) return false;
  return (
    (selectors.orgUnitIds?.length ?? 0) === 0 &&
    (selectors.teamIds?.length ?? 0) === 0 &&
    (selectors.roleIds?.length ?? 0) === 0 &&
    (selectors.roleKeys?.length ?? 0) === 0
  );
}
