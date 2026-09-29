/**
 * UI ↔ server mapping for Requirement draft audience (composition + legacy flat fields).
 */

import {
  flattenRequirementAudienceCompositionToLegacyInput,
  legacyFlatInputToRequirementAudienceComposition,
  parseRequirementAudienceCompositionJson,
  requirementAudienceCompositionIsEmpty,
  type RequirementAudienceComposition,
} from "./requirement-audience-composition-model";
import type { RequirementAudienceSelection, RequirementDto } from "./types";

export function emptyRequirementAudienceSelection(): RequirementAudienceSelection {
  return {
    personIds: [],
    teamIds: [],
    orgUnitIds: [],
    roleIds: [],
    targetGroupIds: [],
    excludePersonIds: [],
    composition: null,
  };
}

export function requirementAudienceSelectionHasContent(
  selection: RequirementAudienceSelection,
): boolean {
  const composition =
    selection.composition ??
    legacyFlatInputToRequirementAudienceComposition(selection);
  return !requirementAudienceCompositionIsEmpty(composition);
}

export function normalizeRequirementAudienceSelection(
  selection: RequirementAudienceSelection,
): RequirementAudienceSelection {
  const composition =
    selection.composition && !requirementAudienceCompositionIsEmpty(selection.composition)
      ? {
          ...selection.composition,
          excludePersonIds: [...new Set(selection.composition.excludePersonIds)],
        }
      : legacyFlatInputToRequirementAudienceComposition({
          ...selection,
          excludePersonIds: selection.excludePersonIds,
        });

  const flat = flattenRequirementAudienceCompositionToLegacyInput(composition);

  return {
    personIds: [...(flat.personIds ?? [])],
    teamIds: [...(flat.teamIds ?? [])],
    orgUnitIds: [...(flat.orgUnitIds ?? [])],
    roleIds: [...(flat.roleIds ?? [])],
    targetGroupIds: [...(flat.targetGroupIds ?? [])],
    excludePersonIds: [...composition.excludePersonIds],
    composition: requirementAudienceCompositionIsEmpty(composition) ? null : composition,
  };
}

export function requirementAudienceSelectionFromDto(
  requirement: Pick<
    RequirementDto,
    | "draftAudiencePersonIds"
    | "draftAudienceTeamIds"
    | "draftAudienceOrgUnitIds"
    | "draftAudienceRoleIds"
    | "draftAudienceTargetGroupIds"
    | "draftAudienceComposition"
  >,
): RequirementAudienceSelection {
  if (requirement.draftAudienceComposition) {
    return normalizeRequirementAudienceSelection({
      personIds: requirement.draftAudiencePersonIds,
      teamIds: requirement.draftAudienceTeamIds,
      orgUnitIds: requirement.draftAudienceOrgUnitIds,
      roleIds: requirement.draftAudienceRoleIds,
      targetGroupIds: requirement.draftAudienceTargetGroupIds,
      excludePersonIds: requirement.draftAudienceComposition.excludePersonIds,
      composition: requirement.draftAudienceComposition,
    });
  }

  return normalizeRequirementAudienceSelection({
    personIds: requirement.draftAudiencePersonIds,
    teamIds: requirement.draftAudienceTeamIds,
    orgUnitIds: requirement.draftAudienceOrgUnitIds,
    roleIds: requirement.draftAudienceRoleIds,
    targetGroupIds: requirement.draftAudienceTargetGroupIds,
    excludePersonIds: [],
    composition: null,
  });
}

export function parseRequirementAudienceCompositionFromForm(
  raw: FormDataEntryValue | null,
): RequirementAudienceComposition | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parseRequirementAudienceCompositionJson(parsed);
  } catch {
    return null;
  }
}
