/**
 * SCE-COMM-EVO-03 — shared composer audience selection (UI state ↔ CommunicationAudienceSpec).
 */

import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { StructuralAudienceSelectors } from "@/lib/communication/platform/audience/structural-targets";
import { structuralSelectorsAreEmpty } from "@/lib/communication/platform/audience/structural-targets";
import { TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";

export type CommunicationAudienceSelection = {
  wholeOrganisation: boolean;
  orgUnitIds: string[];
  teamIds: string[];
  roleIds: string[];
  targetGroupIds: string[];
  personIds: string[];
  externalContactIds: string[];
  excludePersonIds: string[];
  excludeExternalContactIds: string[];
};

export function emptyCommunicationAudienceSelection(): CommunicationAudienceSelection {
  return {
    wholeOrganisation: false,
    orgUnitIds: [],
    teamIds: [],
    roleIds: [],
    targetGroupIds: [],
    personIds: [],
    externalContactIds: [],
    excludePersonIds: [],
    excludeExternalContactIds: [],
  };
}

function dedupeIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export function communicationAudienceSelectionIsEmpty(
  selection: CommunicationAudienceSelection,
): boolean {
  return (
    !selection.wholeOrganisation &&
    selection.orgUnitIds.length === 0 &&
    selection.teamIds.length === 0 &&
    selection.roleIds.length === 0 &&
    selection.targetGroupIds.length === 0 &&
    selection.personIds.length === 0 &&
    selection.externalContactIds.length === 0
  );
}

/**
 * Maps UI selection to canonical spec.
 *
 * Combination semantics (COMM-03):
 * - Spec composition is UNION.
 * - Org units, teams and roles in one structural block are UNIONed.
 * - Each saved Zielgruppe is a separate UNION component.
 * - Explicit persons are UNIONed with structural / Zielgruppe components.
 */
export function buildCommunicationAudienceSpec(
  selection: CommunicationAudienceSelection,
): CommunicationAudienceSpec {
  if (selection.wholeOrganisation) {
    return {
      composition: "UNION",
      components: [{ structural: { wholeOrganisation: true } }],
    };
  }

  const components: CommunicationAudienceSpec["components"] = [];

  const structural: StructuralAudienceSelectors = {};
  if (selection.orgUnitIds.length > 0) {
    structural.orgUnitIds = dedupeIds(selection.orgUnitIds);
  }
  if (selection.teamIds.length > 0) {
    structural.teamIds = dedupeIds(selection.teamIds);
  }
  if (selection.roleIds.length > 0) {
    structural.roleIds = dedupeIds(selection.roleIds);
  }
  if (!structuralSelectorsAreEmpty(structural)) {
    components.push({ structural });
  }

  for (const id of dedupeIds(selection.targetGroupIds)) {
    components.push({ savedTargetGroupIds: [id] });
  }

  if (selection.personIds.length > 0 || selection.excludePersonIds.length > 0) {
    components.push({
      explicit: {
        includePersonIds: selection.personIds.length
          ? dedupeIds(selection.personIds)
          : undefined,
        excludePersonIds:
          selection.excludePersonIds.length > 0
            ? dedupeIds(selection.excludePersonIds)
            : undefined,
      },
    });
  }

  if (selection.externalContactIds.length > 0 || selection.excludeExternalContactIds.length > 0) {
    components.push({
      external: {
        includeExternalContactIds: selection.externalContactIds.length
          ? dedupeIds(selection.externalContactIds)
          : undefined,
        excludeExternalContactIds:
          selection.excludeExternalContactIds.length > 0
            ? dedupeIds(selection.excludeExternalContactIds)
            : undefined,
      },
    });
  }

  if (components.length === 0) {
    throw new TeamCommunicationValidationError("at least one audience target is required");
  }

  return { composition: "UNION", components };
}

export function inferCommunicationAudienceSelection(
  spec: CommunicationAudienceSpec,
): CommunicationAudienceSelection {
  const selection = emptyCommunicationAudienceSelection();

  for (const component of spec.components) {
    if (component.structural?.wholeOrganisation) {
      selection.wholeOrganisation = true;
    }
    if (component.structural?.orgUnitIds?.length) {
      selection.orgUnitIds.push(...component.structural.orgUnitIds);
    }
    if (component.structural?.teamIds?.length) {
      selection.teamIds.push(...component.structural.teamIds);
    }
    if (component.structural?.roleIds?.length) {
      selection.roleIds.push(...component.structural.roleIds);
    }
    if (component.structural?.roleKeys?.length) {
      /* roleKeys are resolved at dispatch; composer uses roleIds only */
    }
    if (component.savedTargetGroupIds?.length) {
      selection.targetGroupIds.push(...component.savedTargetGroupIds);
    }
    if (component.explicit?.includePersonIds?.length) {
      selection.personIds.push(...component.explicit.includePersonIds);
    }
    if (component.explicit?.excludePersonIds?.length) {
      selection.excludePersonIds.push(...component.explicit.excludePersonIds);
    }
    if (component.external?.includeExternalContactIds?.length) {
      selection.externalContactIds.push(...component.external.includeExternalContactIds);
    }
    if (component.external?.excludeExternalContactIds?.length) {
      selection.excludeExternalContactIds.push(...component.external.excludeExternalContactIds);
    }
  }

  selection.orgUnitIds = dedupeIds(selection.orgUnitIds);
  selection.teamIds = dedupeIds(selection.teamIds);
  selection.roleIds = dedupeIds(selection.roleIds);
  selection.targetGroupIds = dedupeIds(selection.targetGroupIds);
  selection.personIds = dedupeIds(selection.personIds);
  selection.externalContactIds = dedupeIds(selection.externalContactIds);
  selection.excludePersonIds = dedupeIds(selection.excludePersonIds);
  selection.excludeExternalContactIds = dedupeIds(selection.excludeExternalContactIds);

  if (selection.wholeOrganisation) {
    return {
      wholeOrganisation: true,
      orgUnitIds: [],
      teamIds: [],
      roleIds: [],
      targetGroupIds: [],
      personIds: [],
      externalContactIds: [],
      excludePersonIds: [],
      excludeExternalContactIds: [],
    };
  }

  return selection;
}
