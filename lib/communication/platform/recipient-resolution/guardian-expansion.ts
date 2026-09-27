/**
 * SCE-COMM-03 — Stage C: safeguarding + guardian expansion port implementation.
 */

import { prisma } from "@/lib/db/prisma";
import type { GuardianExpansionPort } from "@/lib/communication/platform/recipient-resolution/pipeline";
import type { CommunicationChannel } from "@/lib/communication/platform/channels";
import {
  evaluateSafeguardingCommunication,
  type TenantSafeguardingCommunicationPolicy,
} from "@/lib/communication/platform/safeguarding/guardian-policy-seam";
import { loadSubjectPersonNotificationContexts } from "@/lib/notifications/requirement-recipient-resolution";

export const DEFAULT_TENANT_SAFEGUARDING_POLICY = (
  tenantId: string,
): TenantSafeguardingCommunicationPolicy => ({
  tenantId,
  minorDirectMessaging: "BLOCK_TRAINER_TO_MINOR_DIRECT",
  guardianRecipient: "GUARDIAN_SUBSTITUTION",
  expandTeamOperationalToGuardians: true,
});

function subjectIsMinor(dateOfBirth: Date | null, now: Date): boolean {
  if (!dateOfBirth) return false;
  const ageMs = now.getTime() - dateOfBirth.getTime();
  const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
  return ageYears < 18;
}

export function createGuardianExpansionPort(
  policy: TenantSafeguardingCommunicationPolicy = DEFAULT_TENANT_SAFEGUARDING_POLICY(""),
): GuardianExpansionPort {
  return {
    expandSubjectsToDeliveryTargets: async ({
      tenantId,
      subjectPersonIds,
      category,
      channel,
    }) => {
      void category;
      const effectivePolicy =
        policy.tenantId === tenantId ? policy : DEFAULT_TENANT_SAFEGUARDING_POLICY(tenantId);
      const now = new Date();

      const persons = await prisma.person.findMany({
        where: { tenantId, id: { in: [...subjectPersonIds] } },
        select: {
          id: true,
          dateOfBirth: true,
          userId: true,
          guardianRelationshipsAsChild: {
            select: { guardianPersonId: true, isPrimary: true },
          },
        },
      });

      const notificationContexts = await loadSubjectPersonNotificationContexts(
        tenantId,
        [...subjectPersonIds],
      );

      return persons.map((person) => {
        const isMinor = subjectIsMinor(person.dateOfBirth, now);
        const safeguarding = evaluateSafeguardingCommunication({
          policy: effectivePolicy,
          senderUserId: "",
          subjectPersonId: person.id,
          subjectIsMinor: isMinor,
          channel: channel as CommunicationChannel,
        });

        if (!safeguarding.allowed) {
          return {
            subjectPersonId: person.id,
            deliveryUserIds: [],
            viaGuardianSubstitution: false,
          };
        }

        const ctx = notificationContexts.get(person.id);
        const deliveryUserIds = new Set<string>();
        if (ctx?.selfUserId) deliveryUserIds.add(ctx.selfUserId);
        for (const guardianUserId of ctx?.guardianUserIds ?? []) {
          deliveryUserIds.add(guardianUserId);
        }

        const viaGuardianSubstitution =
          isMinor &&
          effectivePolicy.expandTeamOperationalToGuardians &&
          (ctx?.guardianUserIds.length ?? 0) > 0 &&
          safeguarding.expandToGuardianPersonIds.length >= 0;

        return {
          subjectPersonId: person.id,
          deliveryUserIds: [...deliveryUserIds],
          viaGuardianSubstitution: Boolean(viaGuardianSubstitution),
        };
      });
    },
  };
}

export async function loadGuardianExpansionsForSubjects(input: {
  tenantId: string;
  subjectPersonIds: readonly string[];
}): Promise<
  { sourcePersonId: string; guardianPersonId: string; policyReason: string }[]
> {
  if (input.subjectPersonIds.length === 0) return [];
  const rows = await prisma.guardianRelationship.findMany({
    where: { tenantId: input.tenantId, childPersonId: { in: [...input.subjectPersonIds] } },
    select: { childPersonId: true, guardianPersonId: true, isPrimary: true },
    orderBy: [{ childPersonId: "asc" }, { isPrimary: "desc" }],
  });
  return rows.map((r) => ({
    sourcePersonId: r.childPersonId,
    guardianPersonId: r.guardianPersonId,
    policyReason: r.isPrimary ? "PRIMARY_GUARDIAN" : "GUARDIAN",
  }));
}
