/**
 * Canonical OrgUnit people derivation for Organisation Builder (R7).
 *
 * Staff / functions: authoritative ACTIVE PersonAssignment rows.
 * Leadership: separate deriveOrgUnitResponsibility (primary OrgUnitMembership only).
 */

import { getPersonFunctionLabel, isPersonFunctionKey } from "@/lib/people/functions";
import type { OrgUnitPreviewRoleResolver } from "@/lib/org/org-unit-preview-model";
import {
  membershipDisplayName,
  type OrgUnitMembershipResponsibleInput,
  type OrgUnitResponsiblePerson,
} from "@/lib/org/org-unit-responsibility";

export type OrgUnitStaffAssignmentInput = {
  id: string;
  personId: string;
  functionKey: string;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
  };
  team: { id: string; name: string; shortName: string | null } | null;
};

export type OrgUnitPersonIdentity = {
  /** Stable dedupe key: `person:${personId}` */
  identityKey: string;
  personId: string;
  displayName: string;
  functionTitle: string | null;
  teamLabels: string[];
};

export type OrgUnitPeopleDerivation = {
  allPeople: OrgUnitPersonIdentity[];
  staffCount: number;
};

export const ORG_UNIT_PEOPLE_DEDUPLICATION =
  "personId — multiple ACTIVE PersonAssignment rows merge; function titles joined with · ; team labels deduped and sorted" as const;

export function resolveOrgUnitPersonFunctionTitle(
  functionKey: string | null | undefined,
  resolveRoleName?: OrgUnitPreviewRoleResolver,
): string | null {
  if (!functionKey?.trim()) return null;
  if (isPersonFunctionKey(functionKey)) return getPersonFunctionLabel(functionKey);
  return resolveRoleName?.(functionKey) ?? functionKey;
}

export function personIdentityKey(personId: string): string {
  return `person:${personId}`;
}

export function responsiblePersonIdentityKeys(
  responsible: OrgUnitResponsiblePerson[],
): Set<string> {
  const keys = new Set<string>();
  for (const r of responsible) {
    if (r.avatarPersonId) keys.add(personIdentityKey(r.avatarPersonId));
  }
  return keys;
}

/**
 * Derives all Mitarbeitende from ACTIVE PersonAssignment rows for one OrgUnit.
 */
export function deriveOrgUnitPeopleFromAssignments(
  assignments: OrgUnitStaffAssignmentInput[],
  resolveRoleName?: OrgUnitPreviewRoleResolver,
): OrgUnitPeopleDerivation {
  const byPerson = new Map<string, OrgUnitPersonIdentity>();

  for (const row of assignments) {
    const displayName =
      row.person.displayName?.trim() ||
      `${row.person.firstName} ${row.person.lastName}`.trim();
    if (!displayName) continue;

    const functionTitle = resolveOrgUnitPersonFunctionTitle(row.functionKey, resolveRoleName);
    const teamLabel = row.team?.shortName?.trim() || row.team?.name?.trim() || null;
    const key = personIdentityKey(row.personId);

    const existing = byPerson.get(key);
    if (!existing) {
      byPerson.set(key, {
        identityKey: key,
        personId: row.personId,
        displayName,
        functionTitle,
        teamLabels: teamLabel ? [teamLabel] : [],
      });
      continue;
    }

    if (functionTitle && existing.functionTitle !== functionTitle) {
      const parts = new Set(
        `${existing.functionTitle ?? ""} · ${functionTitle}`
          .split(" · ")
          .map((s) => s.trim())
          .filter(Boolean),
      );
      existing.functionTitle = [...parts].join(" · ");
    } else if (!existing.functionTitle && functionTitle) {
      existing.functionTitle = functionTitle;
    }

    if (teamLabel && !existing.teamLabels.includes(teamLabel)) {
      existing.teamLabels.push(teamLabel);
    }
  }

  const allPeople = [...byPerson.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "de"),
  );

  return { allPeople, staffCount: allPeople.length };
}

export const ORG_UNIT_PREVIEW_MAX_ADDITIONAL_STAFF = 2 as const;

export function pickPreviewStaffPeople(input: {
  allPeople: OrgUnitPersonIdentity[];
  excludeIdentityKeys: Set<string>;
  maxVisible?: number;
}): { visible: OrgUnitPersonIdentity[]; additionalCount: number } {
  const maxVisible = input.maxVisible ?? ORG_UNIT_PREVIEW_MAX_ADDITIONAL_STAFF;
  const filtered = input.allPeople.filter((p) => !input.excludeIdentityKeys.has(p.identityKey));
  return {
    visible: filtered.slice(0, maxVisible),
    additionalCount: Math.max(0, filtered.length - maxVisible),
  };
}

export function pickInspectorStaffPreview(input: {
  allPeople: OrgUnitPersonIdentity[];
  maxVisible?: number;
}): { visible: OrgUnitPersonIdentity[]; additionalCount: number } {
  const maxVisible = input.maxVisible ?? 3;
  return {
    visible: input.allPeople.slice(0, maxVisible),
    additionalCount: Math.max(0, input.allPeople.length - maxVisible),
  };
}

/** Membership display names for search secondary metadata — not used for responsibility inference. */
export function membershipSearchNames(memberships: OrgUnitMembershipResponsibleInput[]): string[] {
  const names: string[] = [];
  for (const m of memberships) {
    const name = membershipDisplayName(m);
    if (name) names.push(name);
  }
  return names;
}
