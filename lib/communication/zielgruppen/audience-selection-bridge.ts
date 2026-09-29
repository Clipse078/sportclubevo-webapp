import type { CommunicationAudienceSelection } from "@/lib/communication/audience/communication-audience-selection";
import { emptyCommunicationAudienceSelection } from "@/lib/communication/audience/communication-audience-selection";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";

/** Direct-add slice of the editor definition for CommunicationAudienceSelector. */
export function zielgruppeDirectAudienceSelection(
  definition: ZielgruppeEditorDefinition,
): CommunicationAudienceSelection {
  return {
    ...emptyCommunicationAudienceSelection(),
    personIds: [...definition.includePersonIds],
    externalContactIds: [...definition.includeExternalContactIds],
  };
}

export function mergeDirectAudienceSelectionIntoDefinition(
  definition: ZielgruppeEditorDefinition,
  selection: CommunicationAudienceSelection,
): ZielgruppeEditorDefinition {
  return {
    ...definition,
    includePersonIds: [...selection.personIds],
    includeExternalContactIds: [...selection.externalContactIds],
  };
}

/** Exclusion picker selection (reuses selector id fields for “already selected”). */
export function zielgruppeExcludeAudienceSelection(
  definition: ZielgruppeEditorDefinition,
): CommunicationAudienceSelection {
  return {
    ...emptyCommunicationAudienceSelection(),
    orgUnitIds: [...definition.excludeOrgUnitIds],
    teamIds: [...definition.excludeTeamIds],
    roleIds: [...definition.excludeRoleIds],
    personIds: [...definition.excludePersonIds],
    externalContactIds: [...definition.excludeExternalContactIds],
  };
}

/** Dynamic include conditions for discover “already selected”. */
export function zielgruppeDynamicIncludeAudienceSelection(
  definition: ZielgruppeEditorDefinition,
): CommunicationAudienceSelection {
  return {
    ...emptyCommunicationAudienceSelection(),
    orgUnitIds: [...definition.orgUnitIds],
    teamIds: [...definition.teamIds],
    roleIds: [...definition.roleIds],
  };
}
