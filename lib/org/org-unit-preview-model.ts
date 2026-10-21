import { getPersonFunctionLabel, isPersonFunctionKey } from "@/lib/people/functions";
import {
  deriveOrgUnitPeopleFromAssignments,
  pickPreviewStaffPeople,
  responsiblePersonIdentityKeys,
  type OrgUnitStaffAssignmentInput,
} from "@/lib/org/org-unit-people";
import {
  deriveOrgUnitResponsibility,
  ORG_UNIT_NO_RESPONSIBLE_LABEL,
  type OrgUnitMembershipResponsibleInput,
  type OrgUnitResponsiblePerson,
} from "@/lib/org/org-unit-responsibility";

export const ORG_UNIT_NO_STAFF_LABEL = "Noch keine Mitarbeitenden zugeordnet" as const;

export type OrgUnitPreviewRoleResolver = (roleKey: string) => string | null;

export type OrgUnitPreviewSourceUnit = {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  childCount: number;
  teamCount: number;
  staffCount: number;
};

export type SceOrgUnitPreviewModel = {
  unitId: string;
  name: string;
  typeLabel: string;
  statusSuffix: string | null;
  description: string | null;
  responsibility: {
    primary: OrgUnitResponsiblePerson | null;
    additionalPrimaryCount: number;
    emptyLabel: typeof ORG_UNIT_NO_RESPONSIBLE_LABEL;
    primaryRoleLabel: string | null;
  };
  structureLine: string | null;
  staff: {
    totalCount: number;
    previewPeople: { personId: string; displayName: string; functionTitle: string | null }[];
    additionalCount: number;
    emptyLabel: typeof ORG_UNIT_NO_STAFF_LABEL;
  };
};

const TYPE_LABELS: Record<string, string> = {
  CLUB: "Verein",
  DIVISION: "Abteilung",
  DEPARTMENT: "Ressort",
  SUB_DEPARTMENT: "Unterressort",
  TEAM: "Mannschaft",
  COMMITTEE: "Ausschuss",
  PROJECT_GROUP: "Projektgruppe",
  CUSTOM: "Benutzerdefiniert",
};

export function resolveOrgUnitMembershipRoleLabel(
  roleKey: string | null,
  resolveRoleName?: OrgUnitPreviewRoleResolver,
): string | null {
  if (!roleKey?.trim()) return null;
  if (isPersonFunctionKey(roleKey)) return getPersonFunctionLabel(roleKey);
  const fromRoles = resolveRoleName?.(roleKey);
  if (fromRoles) return fromRoles;
  return roleKey;
}

export function buildOrgUnitStructureSummaryLine(input: {
  childCount: number;
  teamCount: number;
  staffCount: number;
}): string | null {
  const parts: string[] = [];
  if (input.childCount > 0) {
    parts.push(
      `${input.childCount} Untereinheit${input.childCount === 1 ? "" : "en"}`,
    );
  }
  if (input.teamCount > 0) {
    parts.push(`${input.teamCount} Team${input.teamCount === 1 ? "" : "s"}`);
  }
  if (input.staffCount > 0) {
    parts.push(
      `${input.staffCount} Mitarbeitende${input.staffCount === 1 ? "" : ""}`,
    );
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function buildOrgUnitNodeMetaLine(input: {
  teamCount: number;
  staffCount: number;
}): string | null {
  const parts: string[] = [];
  if (input.teamCount > 0) {
    parts.push(`${input.teamCount} Team${input.teamCount === 1 ? "" : "s"}`);
  }
  if (input.staffCount > 0) {
    parts.push(`${input.staffCount} Mitarbeitende`);
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function buildSceOrgUnitPreviewModel(input: {
  unit: OrgUnitPreviewSourceUnit;
  memberships: OrgUnitMembershipResponsibleInput[];
  staffAssignments?: OrgUnitStaffAssignmentInput[];
  resolveRoleName?: OrgUnitPreviewRoleResolver;
}): SceOrgUnitPreviewModel {
  const typeLabel = TYPE_LABELS[input.unit.type] ?? input.unit.type;
  const statusSuffix =
    input.unit.status === "ARCHIVED"
      ? "Archiviert"
      : input.unit.status === "INACTIVE"
        ? "Inaktiv"
        : null;

  const responsibility = deriveOrgUnitResponsibility(input.memberships);
  const primaryRoleLabel = responsibility.primary
    ? resolveOrgUnitMembershipRoleLabel(responsibility.primary.roleKey, input.resolveRoleName)
    : null;

  const peopleDerivation = deriveOrgUnitPeopleFromAssignments(
    input.staffAssignments ?? [],
    input.resolveRoleName,
  );
  const excludeKeys = responsiblePersonIdentityKeys(responsibility.responsiblePersons);
  const staffPreview = pickPreviewStaffPeople({
    allPeople: peopleDerivation.allPeople,
    excludeIdentityKeys: excludeKeys,
  });

  return {
    unitId: input.unit.id,
    name: input.unit.name,
    typeLabel,
    statusSuffix,
    description: input.unit.description?.trim() || null,
    responsibility: {
      primary: responsibility.primary,
      additionalPrimaryCount: responsibility.additionalPrimaryCount,
      emptyLabel: ORG_UNIT_NO_RESPONSIBLE_LABEL,
      primaryRoleLabel,
    },
    structureLine: buildOrgUnitStructureSummaryLine({
      childCount: input.unit.childCount,
      teamCount: input.unit.teamCount,
      staffCount: input.unit.staffCount,
    }),
    staff: {
      totalCount: peopleDerivation.staffCount,
      previewPeople: staffPreview.visible.map((p) => ({
        personId: p.personId,
        displayName: p.displayName,
        functionTitle: p.functionTitle,
      })),
      additionalCount: staffPreview.additionalCount,
      emptyLabel: ORG_UNIT_NO_STAFF_LABEL,
    },
  };
}
