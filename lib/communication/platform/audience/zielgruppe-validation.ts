/**
 * SCE-COMM-01 — fail-closed validation for audience definitions.
 *
 * No arbitrary query language: only TargetGroupClause + structural selectors +
 * explicit include/exclude lists + saved group references.
 */

import { validateRuleJson } from "@/lib/org/target-group-types";
import {
  structuralSelectorsAreEmpty,
  type StructuralAudienceSelectors,
} from "@/lib/communication/platform/audience/structural-targets";
import type {
  CommunicationAudienceSpec,
  DomainAudienceReference,
  ZielgruppeAudienceComponent,
} from "@/lib/communication/platform/audience/zielgruppe-definition";
import { domainAudienceReferenceIsEmpty } from "@/lib/communication/platform/audience/zielgruppe-definition";
import {
  sponsorSelectorsAreEmpty,
  type SponsorAudienceSelectors,
} from "@/lib/sponsoring/sponsor-audience-selectors";

const MAX_COMPONENTS = 20;
const MAX_IDS_PER_LIST = 500;

function validateIdList(field: string, ids: string[] | undefined): string | null {
  if (!ids) return null;
  if (!Array.isArray(ids)) return `${field} must be an array`;
  if (ids.length > MAX_IDS_PER_LIST) {
    return `${field} exceeds maximum of ${MAX_IDS_PER_LIST} entries`;
  }
  for (const id of ids) {
    if (typeof id !== "string" || !id.trim()) {
      return `${field} contains invalid id`;
    }
  }
  return null;
}

function validateSponsorSelectors(selectors: SponsorAudienceSelectors | undefined): string | null {
  if (!selectors || sponsorSelectorsAreEmpty(selectors)) return null;
  const err =
    validateIdList("sponsorOrganisationIds", selectors.sponsorOrganisationIds) ??
    validateIdList("sponsorContactIds", selectors.sponsorContactIds) ??
    validateIdList("sponsorCategoryIds", selectors.sponsorCategoryIds);
  return err;
}

function validateStructural(selectors: StructuralAudienceSelectors | undefined): string | null {
  if (!selectors) return null;
  if (selectors.wholeOrganisation === true) return null;
  const err =
    validateIdList("orgUnitIds", selectors.orgUnitIds) ??
    validateIdList("teamIds", selectors.teamIds) ??
    validateIdList("roleIds", selectors.roleIds) ??
    validateIdList("roleKeys", selectors.roleKeys);
  return err;
}

function validateDomainAudienceReference(
  ref: DomainAudienceReference | undefined,
  prefix: string,
): string | null {
  if (!ref || domainAudienceReferenceIsEmpty(ref)) return null;
  if (typeof ref.sourceKey !== "string" || !ref.sourceKey.includes(".")) {
    return `${prefix}: domainAudience.sourceKey must be a stable composite key (domain.source)`;
  }
  if (typeof ref.candidateId !== "string" || !ref.candidateId.trim()) {
    return `${prefix}: domainAudience.candidateId is required`;
  }
  if (ref.displayLabel != null && typeof ref.displayLabel !== "string") {
    return `${prefix}: domainAudience.displayLabel must be a string when set`;
  }
  return null;
}

function validateComponent(component: ZielgruppeAudienceComponent, index: number): string | null {
  const prefix = `components[${index}]`;

  const domainErr = validateDomainAudienceReference(component.domainAudience, prefix);
  if (domainErr) return domainErr;

  const structuralErr = validateStructural(component.structural);
  if (structuralErr) return `${prefix}: ${structuralErr}`;

  const sponsorErr = validateSponsorSelectors(component.sponsor);
  if (sponsorErr) return `${prefix}: ${sponsorErr}`;

  const savedErr = validateIdList("savedTargetGroupIds", component.savedTargetGroupIds);
  if (savedErr) return `${prefix}: ${savedErr}`;

  if (component.dynamicRule !== undefined && component.dynamicRule !== null) {
    const ruleErr = validateRuleJson(component.dynamicRule);
    if (ruleErr) return `${prefix}: dynamicRule: ${ruleErr}`;
  }

  if (component.explicit) {
    const includeErr = validateIdList("includePersonIds", component.explicit.includePersonIds);
    if (includeErr) return `${prefix}: explicit.${includeErr}`;
    const excludeErr = validateIdList("excludePersonIds", component.explicit.excludePersonIds);
    if (excludeErr) return `${prefix}: explicit.${excludeErr}`;

    const include = new Set(component.explicit.includePersonIds ?? []);
    for (const excluded of component.explicit.excludePersonIds ?? []) {
      if (include.has(excluded)) {
        return `${prefix}: person cannot appear in both include and exclude lists`;
      }
    }
  }

  if (component.external) {
    const includeErr = validateIdList(
      "includeExternalContactIds",
      component.external.includeExternalContactIds,
    );
    if (includeErr) return `${prefix}: external.${includeErr}`;
    const excludeErr = validateIdList(
      "excludeExternalContactIds",
      component.external.excludeExternalContactIds,
    );
    if (excludeErr) return `${prefix}: external.${excludeErr}`;

    const include = new Set(component.external.includeExternalContactIds ?? []);
    for (const excluded of component.external.excludeExternalContactIds ?? []) {
      if (include.has(excluded)) {
        return `${prefix}: external contact cannot appear in both include and exclude lists`;
      }
    }
  }

  const hasDomain = !domainAudienceReferenceIsEmpty(component.domainAudience);
  const hasStructural =
    component.structural && !structuralSelectorsAreEmpty(component.structural);
  const hasSaved = (component.savedTargetGroupIds?.length ?? 0) > 0;
  const hasRule = component.dynamicRule != null;
  const hasExplicit = (component.explicit?.includePersonIds?.length ?? 0) > 0;
  const hasExternal = (component.external?.includeExternalContactIds?.length ?? 0) > 0;
  const hasSponsor = !sponsorSelectorsAreEmpty(component.sponsor);

  if (hasDomain) {
    const otherSelectors =
      hasStructural || hasSaved || hasRule || hasExplicit || hasExternal || hasSponsor;
    if (otherSelectors) {
      return `${prefix}: domainAudience cannot be combined with other selectors in the same component`;
    }
    return null;
  }

  if (!hasStructural && !hasSaved && !hasRule && !hasExplicit && !hasExternal && !hasSponsor) {
    return `${prefix}: audience component must specify at least one selector`;
  }

  return null;
}

export function validateCommunicationAudienceSpec(spec: CommunicationAudienceSpec): string | null {
  if (!spec || typeof spec !== "object") return "audience spec must be an object";
  if (spec.composition !== "UNION" && spec.composition !== "INTERSECTION") {
    return "composition must be UNION or INTERSECTION";
  }
  if (!Array.isArray(spec.components) || spec.components.length === 0) {
    return "audience spec requires at least one component";
  }
  if (spec.components.length > MAX_COMPONENTS) {
    return `audience spec exceeds maximum of ${MAX_COMPONENTS} components`;
  }

  for (let i = 0; i < spec.components.length; i++) {
    const err = validateComponent(spec.components[i]!, i);
    if (err) return err;
  }

  return null;
}

/** Set algebra helpers for tests and future resolver (explicit exclude semantics). */
export function applyExplicitPersonIncludeExclude(
  candidatePersonIds: readonly string[],
  explicit: ZielgruppeAudienceComponent["explicit"],
): string[] {
  const base = new Set(candidatePersonIds);
  for (const id of explicit?.includePersonIds ?? []) {
    base.add(id.trim());
  }
  for (const id of explicit?.excludePersonIds ?? []) {
    base.delete(id.trim());
  }
  return [...base];
}

export function unionPersonIdSets(sets: readonly (readonly string[])[]): string[] {
  const out = new Set<string>();
  for (const set of sets) {
    for (const id of set) out.add(id);
  }
  return [...out];
}

export function intersectPersonIdSets(sets: readonly (readonly string[])[]): string[] {
  if (sets.length === 0) return [];
  let current = new Set(sets[0]);
  for (let i = 1; i < sets.length; i++) {
    const next = sets[i]!;
    current = new Set([...current].filter((id) => next.includes(id)));
  }
  return [...current];
}
