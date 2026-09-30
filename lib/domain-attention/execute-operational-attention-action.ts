/**
 * SCE-DOMAIN-OPERATIONAL-ATTENTION-01 — dispatch domain action executors (re-authorize via domain paths).
 */

import { parseDomainOperationalAttentionId } from "./source-identity";
import { loadDomainOperationalAttention } from "./load-domain-operational-attention";
import { SPIELBETRIEB_PARTICIPATION_REMINDER_ACTION_KEY } from "@/lib/spielbetrieb/operational-attention/spielbetrieb-participation-attention-source";
import { executeSpielbetriebOutstandingParticipationReminder } from "@/lib/spielbetrieb/operational-attention/spielbetrieb-participation-reminder-action";
import { TRAINING_PARTICIPATION_REMINDER_ACTION_KEY } from "@/lib/training/operational-attention/training-participation-attention-source";
import { executeTrainingOutstandingParticipationReminder } from "@/lib/training/operational-attention/training-participation-reminder-action";
import { CLUB_EVENT_PARTICIPATION_REMINDER_ACTION_KEY } from "@/lib/events/operational-attention/club-event-participation-attention-source";
import { executeClubEventOutstandingParticipationReminder } from "@/lib/events/operational-attention/club-event-participation-reminder-action";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";

export class DomainOperationalAttentionActionNotFoundError extends Error {
  readonly code = "ATTENTION_ACTION_NOT_FOUND" as const;
}

export class DomainOperationalAttentionItemNotFoundError extends Error {
  readonly code = "ATTENTION_ITEM_NOT_FOUND" as const;
}

export async function executeDomainOperationalAttentionAction(input: {
  tenantId: string;
  userId: string;
  attentionId: string;
  actionKey: string;
  bodyText?: string | null;
  now?: Date;
}): Promise<{ recipientCount: number; resolvedOutstandingCount: number; duplicate?: boolean }> {
  if (!parseDomainOperationalAttentionId(input.attentionId)) {
    throw new DomainOperationalAttentionItemNotFoundError("Invalid operational attention id.");
  }

  const { platform, tenant } = await getRequestEffectivePermissions(input.userId, input.tenantId);
  const permissionKeys = new Set([...platform, ...tenant]);

  const { items } = await loadDomainOperationalAttention({
    tenantId: input.tenantId,
    actorUserId: input.userId,
    permissionKeys,
    now: input.now,
  });

  const item = items.find((row) => row.id === input.attentionId);
  if (!item) {
    throw new DomainOperationalAttentionItemNotFoundError(
      "Operational attention item not found or not authorized.",
    );
  }

  const action = item.actions.find((candidate) => candidate.actionKey === input.actionKey);
  if (!action) {
    throw new DomainOperationalAttentionActionNotFoundError("Action not available on this item.");
  }

  for (const perm of action.requiredPermissions) {
    if (!permissionKeys.has(perm)) {
      throw new DomainOperationalAttentionItemNotFoundError("Action not authorized.");
    }
  }

  const candidateId = action.domainAudience?.candidateId;
  if (!candidateId && action.executionKind === "COMMUNICATION_SEND") {
    throw new DomainOperationalAttentionActionNotFoundError("Action missing live audience selector.");
  }

  switch (input.actionKey) {
    case SPIELBETRIEB_PARTICIPATION_REMINDER_ACTION_KEY: {
      const result = await executeSpielbetriebOutstandingParticipationReminder({
        tenantId: input.tenantId,
        userId: input.userId,
        candidateId: candidateId!,
        bodyText: input.bodyText,
        now: input.now,
      });
      return {
        recipientCount: result.recipientCount,
        resolvedOutstandingCount: result.resolvedOutstandingCount,
        duplicate: result.duplicate,
      };
    }
    case TRAINING_PARTICIPATION_REMINDER_ACTION_KEY: {
      const result = await executeTrainingOutstandingParticipationReminder({
        tenantId: input.tenantId,
        userId: input.userId,
        candidateId: candidateId!,
        bodyText: input.bodyText,
        now: input.now,
      });
      return {
        recipientCount: result.recipientCount,
        resolvedOutstandingCount: result.resolvedOutstandingCount,
        duplicate: result.duplicate,
      };
    }
    case CLUB_EVENT_PARTICIPATION_REMINDER_ACTION_KEY: {
      const result = await executeClubEventOutstandingParticipationReminder({
        tenantId: input.tenantId,
        userId: input.userId,
        candidateId: candidateId!,
        bodyText: input.bodyText,
        now: input.now,
      });
      return {
        recipientCount: result.recipientCount,
        resolvedOutstandingCount: result.resolvedOutstandingCount,
        duplicate: result.duplicate,
      };
    }
    default:
      throw new DomainOperationalAttentionActionNotFoundError(
        `Unsupported operational attention action "${input.actionKey}".`,
      );
  }
}
