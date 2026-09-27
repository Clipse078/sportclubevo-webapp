/**
 * SCE-COMM-05 / COMM-18 — team chat mention safeguarding.
 */

import { prisma } from "@/lib/db/prisma";
import { TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";
import { loadTenantCommunicationSafeguardingPolicy } from "@/lib/communication/platform/safeguarding/tenant-safeguarding-policy";
import { loadGuardianRecipientsForSubjects } from "@/lib/communication/platform/safeguarding/load-guardian-recipients";
import { evaluateCommunicationSafeguarding } from "@/lib/communication/platform/safeguarding/evaluate-communication-safeguarding";
import { resolveSafeguardingDeliveryTargets } from "@/lib/communication/platform/safeguarding/resolve-safeguarding-delivery-targets";

export async function assertTeamChatMentionSafeguarding(input: {
  tenantId: string;
  senderUserId: string;
  mentionedPersonIds: readonly string[];
}): Promise<void> {
  const unique = [...new Set(input.mentionedPersonIds.filter(Boolean))];
  if (unique.length === 0) return;

  const policy = await loadTenantCommunicationSafeguardingPolicy(input.tenantId);
  const persons = await prisma.person.findMany({
    where: { tenantId: input.tenantId, id: { in: unique } },
    select: { id: true, dateOfBirth: true, userId: true },
  });
  const guardianMap = await loadGuardianRecipientsForSubjects({
    tenantId: input.tenantId,
    subjectPersonIds: unique,
  });

  for (const person of persons) {
    const evaluation = evaluateCommunicationSafeguarding({
      policy,
      subject: {
        subjectPersonId: person.id,
        dateOfBirth: person.dateOfBirth,
        selfUserId: person.userId,
        guardianRecipients: guardianMap.get(person.id) ?? [],
      },
      context: { trainerDirectInteraction: true },
    });

    const targets = resolveSafeguardingDeliveryTargets({
      evaluation,
      selfUserId: person.userId,
    });

    if (!evaluation.deliveryPermitted || targets.length === 0) {
      throw new TeamCommunicationValidationError(
        "Jugendschutz: für diese Person ist derzeit kein zustellbarer Erziehungsberechtigter hinterlegt.",
      );
    }
  }
}

export async function resolveTeamChatMentionDeliveryUserIds(input: {
  tenantId: string;
  mentionedPersonIds: readonly string[];
}): Promise<Map<string, string[]>> {
  const policy = await loadTenantCommunicationSafeguardingPolicy(input.tenantId);
  const unique = [...new Set(input.mentionedPersonIds.filter(Boolean))];
  const persons = await prisma.person.findMany({
    where: { tenantId: input.tenantId, id: { in: unique } },
    select: { id: true, dateOfBirth: true, userId: true },
  });
  const guardianMap = await loadGuardianRecipientsForSubjects({
    tenantId: input.tenantId,
    subjectPersonIds: unique,
  });

  const result = new Map<string, string[]>();
  for (const person of persons) {
    const evaluation = evaluateCommunicationSafeguarding({
      policy,
      subject: {
        subjectPersonId: person.id,
        dateOfBirth: person.dateOfBirth,
        selfUserId: person.userId,
        guardianRecipients: guardianMap.get(person.id) ?? [],
      },
      context: { trainerDirectInteraction: true },
    });
    const targets = resolveSafeguardingDeliveryTargets({
      evaluation,
      selfUserId: person.userId,
    });
    result.set(
      person.id,
      targets.map((t) => t.deliveryUserId),
    );
  }
  return result;
}
