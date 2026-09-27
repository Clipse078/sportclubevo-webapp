/**
 * SCE-COMM-10 — canonical smart reminder dispatch (Communication + snapshots + notifications).
 */

import { Prisma, type PlatformCommunicationKind } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import {
  createTeamCommunicationDraft,
  publishTeamCommunication,
} from "@/lib/communication/team/team-communication-service";
import type { CommunicationOrchestrationMeta } from "@/lib/communication/event/orchestration-meta";
import { recordSmartReminderAudit } from "@/lib/communication/smart-reminders/smart-reminder-audit";
import { TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";

export type SmartReminderDispatchInput = {
  tenantId: string;
  teamId: string;
  senderUserId: string;
  kind: Extract<PlatformCommunicationKind, "MESSAGE" | "ANNOUNCEMENT" | "ALERT">;
  subject?: string | null;
  bodyText: string;
  contextRef: CommunicationContextRef;
  audienceSpec: CommunicationAudienceSpec;
  orchestrationMeta: CommunicationOrchestrationMeta;
  /** When set, duplicate scheduled executions are suppressed via CommunicationReminderExecution. */
  executionIdentity?: string | null;
};

export type SmartReminderDispatchResult =
  | { status: "published"; communicationId: string; recipientCount: number }
  | { status: "duplicate_execution"; communicationId: string };

function isPrismaUniqueConstraintError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return true;
  }
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

async function findExecutionCommunicationId(input: {
  tenantId: string;
  executionIdentity: string;
}): Promise<string | null> {
  const existing = await prisma.communicationReminderExecution.findUnique({
    where: {
      tenantId_executionIdentity: {
        tenantId: input.tenantId,
        executionIdentity: input.executionIdentity,
      },
    },
    select: { communicationId: true },
  });
  return existing?.communicationId ?? null;
}

export async function dispatchSmartReminderCommunication(
  input: SmartReminderDispatchInput,
): Promise<SmartReminderDispatchResult> {
  const trimmedBody = input.bodyText.replace(/\r\n/g, "\n").trim();
  if (!trimmedBody) {
    throw new TeamCommunicationValidationError("body is required");
  }

  const executionIdentity = input.executionIdentity?.trim() || null;
  if (executionIdentity) {
    const existingCommunicationId = await findExecutionCommunicationId({
      tenantId: input.tenantId,
      executionIdentity,
    });
    if (existingCommunicationId) {
      return {
        status: "duplicate_execution",
        communicationId: existingCommunicationId,
      };
    }
  }

  const draft = await createTeamCommunicationDraft({
    tenantId: input.tenantId,
    teamId: input.teamId,
    senderUserId: input.senderUserId,
    kind: input.kind,
    bodyText: trimmedBody,
    subject: input.subject,
    contextRef: input.contextRef,
    audienceSpec: input.audienceSpec,
    orchestrationMetaJson: input.orchestrationMeta as unknown as Prisma.InputJsonValue,
  });

  if (executionIdentity) {
    try {
      await prisma.communicationReminderExecution.create({
        data: {
          tenantId: input.tenantId,
          executionIdentity,
          communicationId: draft.id,
        },
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        const winnerCommunicationId = await findExecutionCommunicationId({
          tenantId: input.tenantId,
          executionIdentity,
        });
        if (winnerCommunicationId) {
          return {
            status: "duplicate_execution",
            communicationId: winnerCommunicationId,
          };
        }
      }
      throw error;
    }
  }

  let published: { recipientCount: number };
  try {
    published = await publishTeamCommunication({
      tenantId: input.tenantId,
      teamId: input.teamId,
      communicationId: draft.id,
      senderUserId: input.senderUserId,
      preservePreparedAudience: true,
    });
  } catch (error) {
    if (executionIdentity) {
      await prisma.communicationReminderExecution
        .delete({
          where: {
            tenantId_executionIdentity: {
              tenantId: input.tenantId,
              executionIdentity,
            },
          },
        })
        .catch(() => undefined);
    }
    throw error;
  }

  await recordSmartReminderAudit({
    tenantId: input.tenantId,
    actorUserId: input.senderUserId,
    communicationId: draft.id,
    teamId: input.teamId,
    kind: input.kind,
    reminderOrigin: input.orchestrationMeta.reminderOrigin,
    executionIdentity,
  });

  return {
    status: "published",
    communicationId: draft.id,
    recipientCount: published.recipientCount,
  };
}

export async function resolveSubjectPersonIdsFromSnapshotIds(input: {
  tenantId: string;
  snapshotIds: readonly string[];
}): Promise<string[]> {
  if (input.snapshotIds.length === 0) return [];
  const snapshots = await prisma.platformCommunicationRecipientSnapshot.findMany({
    where: { tenantId: input.tenantId, id: { in: [...input.snapshotIds] } },
    select: { subjectPersonId: true },
  });
  const ids = [...new Set(snapshots.map((s) => s.subjectPersonId))];
  ids.sort();
  return ids;
}
