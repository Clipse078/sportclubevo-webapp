/**
 * SCE-COMM-03 / COMM-18 — safeguarding + guardian expansion port implementation.
 */

import { prisma } from "@/lib/db/prisma";
import type { GuardianExpansionPort } from "@/lib/communication/platform/recipient-resolution/pipeline";
import {
  evaluateSafeguardingCommunication,
  type TenantSafeguardingCommunicationPolicy,
} from "@/lib/communication/platform/safeguarding/guardian-policy-seam";
import {
  defaultTenantCommunicationSafeguardingPolicy,
  loadTenantCommunicationSafeguardingPolicy,
  type TenantCommunicationSafeguardingPolicyConfig,
} from "@/lib/communication/platform/safeguarding/tenant-safeguarding-policy";
import { evaluateCommunicationSafeguarding } from "@/lib/communication/platform/safeguarding/evaluate-communication-safeguarding";
import { resolveSafeguardingDeliveryTargets } from "@/lib/communication/platform/safeguarding/resolve-safeguarding-delivery-targets";
import { loadGuardianRecipientsForSubjects } from "@/lib/communication/platform/safeguarding/load-guardian-recipients";
import { isPersonMinorUnderTenantPolicy } from "@/lib/communication/platform/safeguarding/subject-age-policy";

export const DEFAULT_TENANT_SAFEGUARDING_POLICY = (
  tenantId: string,
): TenantSafeguardingCommunicationPolicy => ({
  tenantId,
  minorDirectMessaging: "BLOCK_TRAINER_TO_MINOR_DIRECT",
  guardianRecipient: "GUARDIAN_SUBSTITUTION",
  expandTeamOperationalToGuardians: true,
  config: defaultTenantCommunicationSafeguardingPolicy(tenantId),
});

export function createGuardianExpansionPort(
  policy: TenantSafeguardingCommunicationPolicy = DEFAULT_TENANT_SAFEGUARDING_POLICY(""),
  policyConfig?: TenantCommunicationSafeguardingPolicyConfig,
): GuardianExpansionPort {
  return {
    expandSubjectsToDeliveryTargets: async ({
      tenantId,
      subjectPersonIds,
      category,
      channel,
    }) => {
      void category;
      void channel;
      const effectivePolicy =
        policyConfig ??
        policy.config ??
        (policy.tenantId === tenantId
          ? defaultTenantCommunicationSafeguardingPolicy(tenantId)
          : defaultTenantCommunicationSafeguardingPolicy(tenantId));
      const now = new Date();

      const persons = await prisma.person.findMany({
        where: { tenantId, id: { in: [...subjectPersonIds] } },
        select: {
          id: true,
          dateOfBirth: true,
          userId: true,
        },
      });

      const guardianMap = await loadGuardianRecipientsForSubjects({
        tenantId,
        subjectPersonIds,
      });

      return persons.map((person) => {
        const guardianRecipients = guardianMap.get(person.id) ?? [];
        const evaluation = evaluateCommunicationSafeguarding({
          policy: effectivePolicy,
          subject: {
            subjectPersonId: person.id,
            dateOfBirth: person.dateOfBirth,
            selfUserId: person.userId,
            guardianRecipients,
          },
          context: { referenceDate: now },
        });

        const deliveryTargets = resolveSafeguardingDeliveryTargets({
          evaluation,
          selfUserId: person.userId,
        });

        return {
          subjectPersonId: person.id,
          deliveryUserIds: deliveryTargets.map((t) => t.deliveryUserId),
          viaGuardianSubstitution: deliveryTargets.some((t) => t.viaGuardianSubstitution),
          safeguardingMeta: deliveryTargets,
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
    where: {
      tenantId: input.tenantId,
      childPersonId: { in: [...input.subjectPersonIds] },
      guardianPerson: { isActive: true },
    },
    select: { childPersonId: true, guardianPersonId: true, isPrimary: true },
    orderBy: [{ childPersonId: "asc" }, { isPrimary: "desc" }],
  });
  return rows.map((r) => ({
    sourcePersonId: r.childPersonId,
    guardianPersonId: r.guardianPersonId,
    policyReason: r.isPrimary ? "PRIMARY_GUARDIAN" : "GUARDIAN",
  }));
}

export async function createGuardianExpansionPortForTenant(
  tenantId: string,
): Promise<GuardianExpansionPort> {
  const config = await loadTenantCommunicationSafeguardingPolicy(tenantId);
  return createGuardianExpansionPort(DEFAULT_TENANT_SAFEGUARDING_POLICY(tenantId), config);
}

export function subjectIsMinorForTenant(input: {
  dateOfBirth: Date | null;
  policy: TenantCommunicationSafeguardingPolicyConfig;
  referenceDate?: Date;
}): boolean {
  if (!input.policy.safeguardingEnabled) return false;
  return isPersonMinorUnderTenantPolicy({
    dateOfBirth: input.dateOfBirth,
    minorAgeThresholdYears: input.policy.minorAgeThresholdYears,
    referenceDate: input.referenceDate ?? new Date(),
  });
}

/** @deprecated Prefer evaluateCommunicationSafeguarding — kept for tests importing legacy helper. */
export { evaluateSafeguardingCommunication };
