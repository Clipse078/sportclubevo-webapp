/**
 * Canonical VL bulk invitation orchestration — dry-run and live paths share planning.
 */

import { prisma } from "@/lib/db/prisma";
import { PILOT_TENANT_KEY } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { FCA_VL_INVITATION_PRESET } from "@/lib/admin/vl-onboarding/fca-vl-invitation-preset";
import {
  resolveVlInvitationPresetRoleState,
  resolveVlInvitationRows,
  type VlInvitationResolvedRow,
} from "@/lib/admin/vl-onboarding/resolve-vl-invitation-rows";
import {
  buildVlContributorRoleSyncDiff,
  type VlContributorRoleSyncDiff,
} from "@/lib/admin/vl-onboarding/vl-contributor-role-sync-diff";
import {
  createPersonAndInvite,
  invitePersonToTenant,
  resendTenantInvitation,
  InvitationDomainError,
  type OnboardPersonOptions,
} from "@/lib/users/mutations";
import {
  ensureVlPersonOrgAssignment,
  VlPersonOrgAssignmentError,
} from "@/lib/admin/vl-onboarding/ensure-vl-person-org-assignment";
import { buildVlInvitationEmailContent } from "@/lib/admin/vl-onboarding/vl-invitation-email-content";
import type {
  VlInvitationTransport,
  VlInvitationTransportResult,
} from "@/lib/admin/vl-onboarding/vl-invitation-transport";
import { INVITATION_PREVIEW_SAMPLE_ACCEPT_URL } from "@/lib/email/templates/invitation-preview-samples";
import {
  validNormalizedBulkEmails,
  type BulkInvitationEmailRow,
} from "@/lib/admin/vl-onboarding/bulk-invitation-emails";
import type { VlInvitationSendMode } from "@/lib/admin/vl-onboarding/vl-invitation-send-policy";

export type VlInvitationRecipientIdentity = {
  email: string;
  firstName?: string;
  lastName?: string;
  functionKey?: string | null;
};

export type VlInvitationOrchestrationRowResult = {
  email: string;
  action: VlInvitationResolvedRow["action"];
  status: "skipped" | "planned" | "invited" | "failed";
  reason?: string;
  userId?: string;
  personId?: string;
  needsDisplayName?: boolean;
};

export type VlInvitationOrchestrationResult = {
  sent: boolean;
  mode: VlInvitationSendMode | "LIVE";
  preservedDraft: boolean;
  contributorRoleProvisioned: boolean;
  contributorRoleSyncDiff: VlContributorRoleSyncDiff;
  validationRows: BulkInvitationEmailRow[];
  resolved: VlInvitationResolvedRow[];
  rows: VlInvitationOrchestrationRowResult[];
  transport: VlInvitationTransportResult[];
  error?: string;
};

const SENDABLE_ACTIONS = new Set<VlInvitationResolvedRow["action"]>([
  "NEW_INVITATION",
  "PERSON_LINK_ACCESS",
  "INVITATION_PENDING",
  "UPDATE_ACCESS",
]);

async function assertFcaPilotTenant(tenantId: string): Promise<{ name: string }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { key: true, name: true },
  });
  if (!tenant || tenant.key !== PILOT_TENANT_KEY) {
    throw new Error("VL-Einladungen nur für FC Allschwil.");
  }
  return { name: tenant.name };
}

async function buildContributorSyncDiff(tenantId: string): Promise<{
  contributorRoleProvisioned: boolean;
  contributorRoleSyncDiff: VlContributorRoleSyncDiff;
  presetRoleId: string | null;
}> {
  const presetRoleId = await prisma.role.findFirst({
    where: {
      tenantId,
      isArchived: false,
      OR: [
        { key: FCA_VL_INVITATION_PRESET.roleMatch.key },
        { name: FCA_VL_INVITATION_PRESET.roleMatch.name },
      ],
    },
    select: {
      id: true,
      canAccessVereinsleitung: true,
      canAttendVereinsleitungMeetings: true,
      rolePermissions: { select: { permission: { select: { key: true } } } },
    },
  });

  const snapshot = presetRoleId
    ? {
        permissionKeys: presetRoleId.rolePermissions.map((rp) => rp.permission.key),
        canAccessVereinsleitung: presetRoleId.canAccessVereinsleitung,
        canAttendVereinsleitungMeetings: presetRoleId.canAttendVereinsleitungMeetings,
      }
    : null;

  const contributorRoleSyncDiff = buildVlContributorRoleSyncDiff(snapshot);
  return {
    contributorRoleProvisioned: presetRoleId !== null,
    contributorRoleSyncDiff,
    presetRoleId: presetRoleId?.id ?? null,
  };
}

async function resolveOrgScopedOnboardOptions(
  tenantId: string,
  presetRoleId: string | null,
): Promise<OnboardPersonOptions | null> {
  if (!presetRoleId) return null;
  const orgUnit = await prisma.orgUnit.findFirst({
    where: { tenantId, key: FCA_VL_INVITATION_PRESET.orgUnitKey },
    select: { id: true },
  });
  if (!orgUnit) return { roleIds: [presetRoleId] };
  return {
    roleIds: [presetRoleId],
    scopedRoles: [{ roleId: presetRoleId, orgUnitId: orgUnit.id, scopeMode: "THIS_ORG_UNIT" }],
  };
}

function identityForRow(
  row: VlInvitationResolvedRow,
  identities: Map<string, VlInvitationRecipientIdentity>,
): VlInvitationRecipientIdentity | undefined {
  return identities.get(row.email.toLowerCase());
}

async function deliverDryRunEmail(
  tenantId: string,
  actorUserId: string,
  email: string,
  firstName: string,
  transport: VlInvitationTransport,
): Promise<VlInvitationTransportResult> {
  const content = await buildVlInvitationEmailContent({
    tenantId,
    recipientEmail: email,
    recipientFirstName: firstName,
    inviteUrlOverride: INVITATION_PREVIEW_SAMPLE_ACCEPT_URL,
    actorUserId,
  });
  return transport.deliver({
    recipientEmail: email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

export async function orchestrateVlInvitationSend(input: {
  tenantId: string;
  actorUserId: string;
  validationRows: BulkInvitationEmailRow[];
  identities?: readonly VlInvitationRecipientIdentity[];
  transport: VlInvitationTransport;
  liveExecution: boolean;
  sendPolicyError?: string;
  sendPolicyMode: VlInvitationSendMode;
}): Promise<VlInvitationOrchestrationResult> {
  await assertFcaPilotTenant(input.tenantId);

  const emails = validNormalizedBulkEmails(input.validationRows);
  const [resolved, roleState] = await Promise.all([
    resolveVlInvitationRows(input.tenantId, emails),
    buildContributorSyncDiff(input.tenantId),
  ]);

  const identityMap = new Map(
    (input.identities ?? []).map((i) => [i.email.toLowerCase(), i]),
  );

  const rows: VlInvitationOrchestrationRowResult[] = [];
  const transportResults: VlInvitationTransportResult[] = [];
  const onboardOptions = await resolveOrgScopedOnboardOptions(
    input.tenantId,
    roleState.presetRoleId,
  );

  const liveBlocked =
    input.liveExecution &&
    (!roleState.contributorRoleProvisioned || onboardOptions === null);

  for (const row of resolved) {
    if (!SENDABLE_ACTIONS.has(row.action)) {
      rows.push({
        email: row.email,
        action: row.action,
        status: "skipped",
        reason: row.action === "MASKED" ? "Mandantenisolation" : "Nicht versendbar",
      });
      continue;
    }

    const identity = identityForRow(row, identityMap);
    const previewFirstName =
      identity?.firstName?.trim() ||
      row.displayName?.split(/\s+/)[0] ||
      "";

    if (input.liveExecution) {
      if (liveBlocked) {
        rows.push({
          email: row.email,
          action: row.action,
          status: "skipped",
          reason: "Contributor-Rolle fehlt im Mandanten",
        });
        continue;
      }

      try {
        const inviteResult = await executeLiveInvitationRow({
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          row,
          identity,
          onboardOptions: {
            ...onboardOptions,
            sendInvitation: false,
            issueInvitationToken: true,
          },
        });

        const emailContent = await buildVlInvitationEmailContent({
          tenantId: input.tenantId,
          recipientEmail: row.email,
          recipientFirstName: previewFirstName || "du",
          rawToken: inviteResult.rawToken,
          variant: inviteResult.variant,
          actorUserId: input.actorUserId,
        });

        const delivery = await input.transport.deliver({
          recipientEmail: row.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        transportResults.push(delivery);
        rows.push({
          email: row.email,
          action: row.action,
          status: "invited",
          userId: inviteResult.userId,
          personId: inviteResult.personId,
        });
      } catch (error) {
        const message =
          error instanceof InvitationDomainError
            ? error.code
            : error instanceof VlPersonOrgAssignmentError
              ? error.code
              : error instanceof Error
                ? error.message
                : "failed";
        rows.push({
          email: row.email,
          action: row.action,
          status: "failed",
          reason: message,
        });
      }
      continue;
    }

    // Dry-run — plan only, mock transport, no persistence
    const needsDisplayName =
      row.action === "NEW_INVITATION" && !previewFirstName;
    const delivery = await deliverDryRunEmail(
      input.tenantId,
      input.actorUserId,
      row.email,
      previewFirstName || "…",
      input.transport,
    );
    transportResults.push(delivery);
    rows.push({
      email: row.email,
      action: row.action,
      status: "planned",
      needsDisplayName,
      reason: needsDisplayName ? "Anzeigename fehlt (Live-Versand)" : undefined,
      userId: row.userId,
      personId: row.personId,
    });
  }

  const sent = input.liveExecution && transportResults.some((t) => t.queued);

  return {
    sent,
    mode: input.liveExecution ? "LIVE" : input.sendPolicyMode,
    preservedDraft: !sent,
    contributorRoleProvisioned: roleState.contributorRoleProvisioned,
    contributorRoleSyncDiff: roleState.contributorRoleSyncDiff,
    validationRows: input.validationRows,
    resolved,
    rows,
    transport: transportResults,
    error: input.sendPolicyError,
  };
}

function requireConfirmedOrgFunction(identity?: VlInvitationRecipientIdentity): string {
  const functionKey = identity?.functionKey?.trim();
  if (!functionKey) {
    throw new VlPersonOrgAssignmentError(
      "VL_ORG_FUNCTION_UNCONFIRMED",
      "Organisationsfunktion erforderlich vor Live-Versand.",
    );
  }
  return functionKey;
}

async function executeLiveInvitationRow(input: {
  tenantId: string;
  actorUserId: string;
  row: VlInvitationResolvedRow;
  identity?: VlInvitationRecipientIdentity;
  onboardOptions: OnboardPersonOptions;
}): Promise<{
  userId: string;
  personId?: string;
  rawToken?: string;
  variant: "new_account" | "existing_account";
}> {
  const { row, tenantId, actorUserId, onboardOptions } = input;

  if (row.action === "NEW_INVITATION") {
    const firstName = input.identity?.firstName?.trim();
    const lastName = input.identity?.lastName?.trim();
    if (!firstName || !lastName) {
      throw new InvitationDomainError(
        "PERSON_NOT_FOUND",
        "Anzeigename (Vor- und Nachname) erforderlich.",
      );
    }
    const functionKey = requireConfirmedOrgFunction(input.identity);
    const result = await createPersonAndInvite(
      tenantId,
      { firstName, lastName, email: row.email },
      actorUserId,
      onboardOptions,
    );
    await ensureVlPersonOrgAssignment({
      tenantId,
      personId: result.personId,
      functionKey,
    });
    return {
      userId: result.userId,
      personId: result.personId,
      rawToken: result.rawToken,
      variant: "new_account",
    };
  }

  if (row.action === "PERSON_LINK_ACCESS" && row.personId) {
    const functionKey = requireConfirmedOrgFunction(input.identity);
    const result = await invitePersonToTenant(
      tenantId,
      row.personId,
      actorUserId,
      onboardOptions,
    );
    await ensureVlPersonOrgAssignment({
      tenantId,
      personId: row.personId,
      functionKey,
    });
    return {
      userId: result.userId,
      personId: row.personId,
      rawToken: result.rawToken,
      variant: "existing_account",
    };
  }

  if (
    (row.action === "INVITATION_PENDING" || row.action === "UPDATE_ACCESS") &&
    row.userId
  ) {
    const functionKey =
      row.personId != null ? requireConfirmedOrgFunction(input.identity) : undefined;
    const rawToken = await resendTenantInvitation(tenantId, row.userId, actorUserId);
    if (row.personId && functionKey) {
      await ensureVlPersonOrgAssignment({
        tenantId,
        personId: row.personId,
        functionKey,
      });
    }
    return {
      userId: row.userId,
      personId: row.personId,
      rawToken,
      variant: "existing_account",
    };
  }

  throw new InvitationDomainError("PERSON_NOT_FOUND", "Zeile nicht auflösbar.");
}

/** Convenience for preset role gate used by prepare/resolve routes. */
export async function loadVlInvitationPresetRoleState(tenantId: string) {
  const [preset, sync] = await Promise.all([
    resolveVlInvitationPresetRoleState(tenantId),
    buildContributorSyncDiff(tenantId),
  ]);
  return {
    ...preset,
    contributorRoleSyncDiff: sync.contributorRoleSyncDiff,
    permissionKeys: [...sync.contributorRoleSyncDiff.permissionKeys],
  };
}