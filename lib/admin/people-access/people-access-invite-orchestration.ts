/**
 * Canonical single-recipient People & Access invitation orchestration.
 * Dry-run and live paths share validation; preview/prepare never persist or send.
 */

import type { OrgUnitScopeMode } from "@prisma/client";
import { lookupPersonByEmailInTenant } from "@/lib/admin/people-access/person-lookup";
import {
  applyOnboardRoleAssignments,
  createPersonAndInvite,
  invitePersonToTenant,
  resendTenantInvitation,
  InvitationDomainError,
  type OnboardPersonOptions,
} from "@/lib/users/mutations";
import { buildPeopleAccessInviteEmailPreview } from "@/lib/admin/people-access/people-access-invite-email-preview";
import {
  assertVlInvitationSendAllowed,
  type VlInvitationSendMode,
} from "@/lib/admin/vl-onboarding/vl-invitation-send-policy";
import type {
  VlInvitationTransport,
  VlInvitationTransportResult,
} from "@/lib/admin/vl-onboarding/vl-invitation-transport";
import { resolveTransactionalSceEmailLogoAbsoluteUrl } from "@/lib/email/resolve-transactional-sce-email-logo-url";
import {
  buildPasswordResetLink,
  resolveSecurityLinkBaseUrl,
} from "@/lib/server/security-link-url";

export type PeopleAccessInviteRecipient = {
  email: string;
  firstName: string;
  lastName: string;
  personId?: string;
};

export type PeopleAccessInviteOrchestrationInput = {
  tenantId: string;
  actorUserId: string;
  recipient: PeopleAccessInviteRecipient;
  roleIds: string[];
  scopedRoles: Array<{
    roleId: string;
    orgUnitId: string;
    scopeMode: OrgUnitScopeMode;
  }>;
  permissionOverrides: Array<{ permissionKey: string; effect: "ALLOW" | "DENY" }>;
  liveExecution: boolean;
  confirmLiveSend?: boolean;
  transport: VlInvitationTransport;
  sendPolicyMode: VlInvitationSendMode;
  sendPolicyError?: string;
};

export type PeopleAccessInviteOrchestrationResult = {
  dryRun: boolean;
  sent: boolean;
  status: "planned" | "invited" | "failed" | "blocked";
  userId?: string;
  personId?: string;
  reason?: string;
  transport: VlInvitationTransportResult[];
  error?: string;
};

function onboardOptions(input: PeopleAccessInviteOrchestrationInput): OnboardPersonOptions {
  return {
    sendInvitation: false,
    issueInvitationToken: input.liveExecution,
    roleIds: input.roleIds,
    scopedRoles: input.scopedRoles,
    permissionOverrides: input.permissionOverrides,
  };
}

async function applyOnboardRoleAssignmentsFromOptions(
  input: PeopleAccessInviteOrchestrationInput,
  userId: string,
): Promise<void> {
  await applyOnboardRoleAssignments(
    input.tenantId,
    userId,
    input.actorUserId,
    onboardOptions(input),
  );
}

async function deliverDryRunPreview(
  input: PeopleAccessInviteOrchestrationInput,
): Promise<VlInvitationTransportResult> {
  const preview = await buildPeopleAccessInviteEmailPreview({
    tenantId: input.tenantId,
    recipientEmail: input.recipient.email,
    recipientFirstName: input.recipient.firstName,
    actorUserId: input.actorUserId,
    sceLogoAbsoluteUrl: resolveTransactionalSceEmailLogoAbsoluteUrl(),
  });
  return input.transport.deliver({
    recipientEmail: input.recipient.email,
    subject: preview.subject,
    html: preview.html,
    text: preview.text,
  });
}

async function deliverLiveInvitation(
  input: PeopleAccessInviteOrchestrationInput,
  rawToken: string,
  variant: "new_account" | "existing_account",
): Promise<VlInvitationTransportResult> {
  const appBaseUrl = resolveSecurityLinkBaseUrl().toString().replace(/\/$/, "");
  const inviteUrl = buildPasswordResetLink(rawToken);
  const preview = await buildPeopleAccessInviteEmailPreview({
    tenantId: input.tenantId,
    recipientEmail: input.recipient.email,
    recipientFirstName: input.recipient.firstName,
    actorUserId: input.actorUserId,
    variant,
    inviteUrl,
    appBaseUrl,
    sceLogoAbsoluteUrl: resolveTransactionalSceEmailLogoAbsoluteUrl(),
  });

  return input.transport.deliver({
    recipientEmail: input.recipient.email,
    subject: preview.subject,
    html: preview.html,
    text: preview.text,
  });
}

export async function orchestratePeopleAccessInvite(
  input: PeopleAccessInviteOrchestrationInput,
): Promise<PeopleAccessInviteOrchestrationResult> {
  const transportResults: VlInvitationTransportResult[] = [];

  if (input.roleIds.length === 0) {
    return {
      dryRun: !input.liveExecution,
      sent: false,
      status: "blocked",
      reason: "Mindestens eine Rolle auswählen.",
      transport: transportResults,
    };
  }

  const sendCheck = assertVlInvitationSendAllowed(input.confirmLiveSend === true);
  if (input.liveExecution && !sendCheck.ok) {
    return {
      dryRun: false,
      sent: false,
      status: "blocked",
      reason: sendCheck.error,
      transport: transportResults,
      error: sendCheck.error,
    };
  }

  if (!input.liveExecution) {
    const delivery = await deliverDryRunPreview(input);
    transportResults.push(delivery);
    return {
      dryRun: true,
      sent: false,
      status: "planned",
      transport: transportResults,
      error: input.sendPolicyError,
    };
  }

  const options = onboardOptions(input);

  try {
    let userId: string;
    let personId: string | undefined;
    let rawToken: string | undefined;
    let variant: "new_account" | "existing_account" = "new_account";

    if (input.recipient.personId) {
      const result = await invitePersonToTenant(
        input.tenantId,
        input.recipient.personId,
        input.actorUserId,
        options,
      );
      userId = result.userId;
      personId = input.recipient.personId;
      rawToken = result.rawToken;
      variant = "existing_account";
    } else {
      const lookup = await lookupPersonByEmailInTenant(input.tenantId, input.recipient.email);
      if (lookup.kind === "person_without_access" && lookup.personId) {
        const result = await invitePersonToTenant(
          input.tenantId,
          lookup.personId,
          input.actorUserId,
          options,
        );
        userId = result.userId;
        personId = lookup.personId;
        rawToken = result.rawToken;
        variant = "existing_account";
      } else if (lookup.kind === "active_member" && lookup.userId) {
        rawToken = await resendTenantInvitation(
          input.tenantId,
          lookup.userId,
          input.actorUserId,
        );
        userId = lookup.userId;
        personId = lookup.personId ?? undefined;
        variant = "existing_account";
        await applyOnboardRoleAssignmentsFromOptions(input, userId);
      } else {
        const result = await createPersonAndInvite(
          input.tenantId,
          {
            firstName: input.recipient.firstName,
            lastName: input.recipient.lastName,
            email: input.recipient.email,
          },
          input.actorUserId,
          options,
        );
        userId = result.userId;
        personId = result.personId;
        rawToken = result.rawToken;
        variant = "new_account";
      }
    }

    if (!rawToken) {
      return {
        dryRun: false,
        sent: false,
        status: "failed",
        userId,
        personId,
        reason: "Kein Einladungstoken.",
        transport: transportResults,
      };
    }

    const delivery = await deliverLiveInvitation(input, rawToken, variant);
    transportResults.push(delivery);
    const sent = delivery.queued;

    return {
      dryRun: false,
      sent,
      status: sent ? "invited" : "planned",
      userId,
      personId,
      transport: transportResults,
    };
  } catch (error) {
    const reason =
      error instanceof InvitationDomainError
        ? error.code
        : error instanceof Error
          ? error.message
          : "failed";
    return {
      dryRun: false,
      sent: false,
      status: "failed",
      reason,
      transport: transportResults,
    };
  }
}