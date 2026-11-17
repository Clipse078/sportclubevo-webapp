/**
 * Server-side resolution for VL bulk invitation workspace rows.
 */

import { prisma } from "@/lib/db/prisma";
import { lookupPersonByEmailInTenant } from "@/lib/admin/people-access/person-lookup";
import { FCA_VL_INVITATION_PRESET } from "@/lib/admin/vl-onboarding/fca-vl-invitation-preset";
import { FCA_VEREINSLEITUNG_STRATEGIC_PERMISSION_KEYS } from "@/lib/roles/fca-vereinsleitung-vl-supplements";
import { userHasVereinsleitungWorkspaceAccess } from "@/lib/permissions/vereinsleitung-workspace-access";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { buildVereinsentwicklungAccessRows } from "@/lib/admin/people-access/vereinsentwicklung-access-presentation";
import { getEffectivePermissionKeysFromRoleIds } from "@/lib/roles/effective-access-summary";

export type VlInvitationRowAction =
  | "EXISTING_ACCESS"
  | "UPDATE_ACCESS"
  | "INVITATION_PENDING"
  | "NEW_INVITATION"
  | "PERSON_LINK_ACCESS"
  | "INVALID"
  | "MASKED";

export type VlInvitationResolvedRow = {
  email: string;
  action: VlInvitationRowAction;
  label: string;
  userId?: string;
  personId?: string;
  displayName?: string;
  pendingInvitation?: boolean;
  missingFunction?: boolean;
  hasPresidentRole?: boolean;
  vlWorkspaceAccess?: boolean;
  meetingAttendanceEligible?: boolean;
  vereinsentwicklungPreview?: ReturnType<typeof buildVereinsentwicklungAccessRows>;
};

async function resolvePresetRoleId(tenantId: string): Promise<string | null> {
  const role = await prisma.role.findFirst({
    where: {
      tenantId,
      isArchived: false,
      OR: [
        { key: FCA_VL_INVITATION_PRESET.roleMatch.key },
        { name: FCA_VL_INVITATION_PRESET.roleMatch.name },
      ],
    },
    select: { id: true, canAttendVereinsleitungMeetings: true },
  });
  return role?.id ?? null;
}

async function userHasPresidentPilotRole(userId: string, tenantId: string): Promise<boolean> {
  const assignment = await prisma.userRole.findFirst({
    where: {
      userId,
      tenantId,
      role: {
        OR: [
          { key: PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE.roleKey },
          { name: PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE.name },
        ],
      },
    },
    select: { id: true },
  });
  return assignment !== null;
}

async function userHasPresetContributorRole(
  userId: string,
  tenantId: string,
  presetRoleId: string | null,
): Promise<boolean> {
  if (!presetRoleId) return false;
  const assignment = await prisma.userRole.findFirst({
    where: { userId, tenantId, roleId: presetRoleId },
    select: { id: true },
  });
  return assignment !== null;
}

async function hasVlOrgAssignment(
  tenantId: string,
  personId: string | null | undefined,
): Promise<boolean> {
  if (!personId) return false;
  const orgUnit = await prisma.orgUnit.findFirst({
    where: { tenantId, key: FCA_VL_INVITATION_PRESET.orgUnitKey },
    select: { id: true },
  });
  if (!orgUnit) return false;
  const assignment = await prisma.personAssignment.findFirst({
    where: {
      tenantId,
      personId,
      orgUnitId: orgUnit.id,
      status: "ACTIVE",
    },
    select: { id: true, functionKey: true },
  });
  return assignment !== null;
}

async function buildPreviewForUser(userId: string, tenantId: string, roleIds: string[]) {
  const preview = await getEffectivePermissionKeysFromRoleIds(tenantId, roleIds);
  return buildVereinsentwicklungAccessRows(new Set(preview.keys));
}

async function buildPreviewForPreset(tenantId: string, presetRoleId: string | null) {
  if (!presetRoleId) {
    return buildVereinsentwicklungAccessRows(new Set(FCA_VL_INVITATION_PRESET.permissionKeys));
  }
  return buildPreviewForUser("", tenantId, [presetRoleId]);
}

function strategicPermissionsSatisfied(keySet: ReadonlySet<string>): boolean {
  return FCA_VEREINSLEITUNG_STRATEGIC_PERMISSION_KEYS.every((k) => keySet.has(k));
}

export async function resolveVlInvitationRow(
  tenantId: string,
  email: string,
): Promise<VlInvitationResolvedRow> {
  const lookup = await lookupPersonByEmailInTenant(tenantId, email);

  if (lookup.kind === "person_other_tenant") {
    return {
      email,
      action: "MASKED",
      label: "E-Mail konnte nicht zugeordnet werden",
    };
  }

  const presetRoleId = await resolvePresetRoleId(tenantId);

  if (lookup.kind === "not_found") {
    return {
      email,
      action: "NEW_INVITATION",
      label: "Neue Einladung",
      missingFunction: true,
      vereinsentwicklungPreview: await buildPreviewForPreset(tenantId, presetRoleId),
    };
  }

  if (lookup.kind === "person_without_access") {
    return {
      email,
      action: "PERSON_LINK_ACCESS",
      label: "Person vorhanden — Zugang einrichten",
      personId: lookup.personId,
      displayName: `${lookup.firstName} ${lookup.lastName}`.trim(),
      missingFunction: true,
      vereinsentwicklungPreview: await buildPreviewForPreset(tenantId, presetRoleId),
    };
  }

  const { userId, personId, pendingInvitation, firstName, lastName } = lookup;

  if (pendingInvitation) {
    return {
      email,
      action: "INVITATION_PENDING",
      label: "Einladung ausstehend",
      userId,
      personId: personId ?? undefined,
      displayName: `${firstName} ${lastName}`.trim(),
      pendingInvitation: true,
      vereinsentwicklungPreview: await buildPreviewForPreset(tenantId, presetRoleId),
    };
  }

  const resolver = createEffectivePermissionResolver(prisma);
  const { tenant: permissionKeys } = await resolver.getEffectivePermissions({ userId, tenantId });
  const keySet = new Set(permissionKeys);

  const vlWorkspace = await userHasVereinsleitungWorkspaceAccess(userId, tenantId);
  const hasPreset = await userHasPresetContributorRole(userId, tenantId, presetRoleId);
  const hasPresident = await userHasPresidentPilotRole(userId, tenantId);
  const orgLinked = await hasVlOrgAssignment(tenantId, personId);

  const meetingEligible = await prisma.userRole.findFirst({
    where: {
      userId,
      tenantId,
      role: { canAttendVereinsleitungMeetings: true, isArchived: false },
    },
    select: { id: true },
  });

  const strategicOk = strategicPermissionsSatisfied(keySet);
  const accessComplete = vlWorkspace && strategicOk && hasPreset && orgLinked && !hasPresident;

  if (accessComplete) {
    const roleIds = (
      await prisma.userRole.findMany({
        where: { userId, tenantId },
        select: { roleId: true },
      })
    ).map((r) => r.roleId);

    return {
      email,
      action: "EXISTING_ACCESS",
      label: "Bereits eingerichtet",
      userId,
      personId: personId ?? undefined,
      displayName: `${firstName} ${lastName}`.trim(),
      vlWorkspaceAccess: true,
      meetingAttendanceEligible: meetingEligible !== null,
      hasPresidentRole: hasPresident,
      vereinsentwicklungPreview: await buildPreviewForUser(userId, tenantId, roleIds),
    };
  }

  return {
    email,
    action: "UPDATE_ACCESS",
    label: hasPresident ? "Anderer VL-Zugang — manuell prüfen" : "Zugriff ergänzen",
    userId,
    personId: personId ?? undefined,
    displayName: `${firstName} ${lastName}`.trim(),
    missingFunction: !orgLinked,
    hasPresidentRole: hasPresident,
    vlWorkspaceAccess: vlWorkspace,
    meetingAttendanceEligible: meetingEligible !== null,
    vereinsentwicklungPreview: await buildPreviewForPreset(tenantId, presetRoleId),
  };
}

export async function resolveVlInvitationRows(
  tenantId: string,
  emails: readonly string[],
): Promise<VlInvitationResolvedRow[]> {
  const out: VlInvitationResolvedRow[] = [];
  for (const email of emails) {
    out.push(await resolveVlInvitationRow(tenantId, email));
  }
  return out;
}