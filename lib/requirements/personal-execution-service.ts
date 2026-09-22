/**
 * AUFGABEN-06G9 — personal Requirement execution read model (recipient-scoped).
 */

import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getAuthorizedPersonIdsForUser } from "@/lib/participation/authorization";
import { buildRequirementPersonalActionId } from "@/lib/personal-actions/identity";
import { presentTaskDeadline } from "@/lib/tasks/management-deadline";
import {
  RequirementForbiddenError,
  RequirementRecipientNotFoundError,
} from "./errors";
import {
  canReadOwnRequirementRecipient,
  canRespondToRequirementRecipient,
} from "./requirement-authorization";
import { resolveRequirementCreatorLabel } from "./management-service";
import {
  resolveRequirementRecipientManagementStatus,
  type RequirementRecipientManagementStatus,
} from "./recipient-progress-presentation";
import type { RequirementRecipientDto, RequirementServiceContext } from "./types";
import {
  formatActingForLabel,
  formatRecipientResponseLabel,
} from "./presentation";

export type PersonalRequirementExecutionView = {
  recipient: RequirementRecipientDto;
  personalActionId: string;
  requirement: {
    id: string;
    title: string;
    description: string | null;
    status: import("@prisma/client").RequirementStatus;
    responseMode: import("@prisma/client").RequirementResponseMode;
    dueAt: string | null;
    createdAt: string;
    activatedAt: string | null;
  };
  subjectDisplayName: string;
  actingForOtherPerson: boolean;
  creatorLabel: string | null;
  responseActorDisplayName: string | null;
  managementStatus: RequirementRecipientManagementStatus;
  deadlinePresentation: ReturnType<typeof presentTaskDeadline>;
  responseLabel: string | null;
  respondedActingForLabel: string | null;
  canRespond: boolean;
  respondBlockedMessage: string | null;
};

function formatPersonDisplayName(person: {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
}): string {
  const fromDisplay = person.displayName?.trim();
  if (fromDisplay) return fromDisplay;
  const parts = [person.firstName, person.lastName].map((p) => p?.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Unbenannt";
}

function mapRecipientRow(
  row: {
    id: string;
    tenantId: string;
    requirementId: string;
    subjectPersonId: string;
    resolutionStatus: import("@prisma/client").RequirementResolutionStatus;
    responseValue: import("@prisma/client").RequirementResponseValue | null;
    respondedAt: Date | null;
    respondedByUserId: string | null;
    responseActorPersonId: string | null;
    removedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
): RequirementRecipientDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    requirementId: row.requirementId,
    subjectPersonId: row.subjectPersonId,
    resolutionStatus: row.resolutionStatus,
    responseValue: row.responseValue,
    respondedAt: row.respondedAt?.toISOString() ?? null,
    respondedByUserId: row.respondedByUserId,
    responseActorPersonId: row.responseActorPersonId,
    removedAt: row.removedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function resolveRespondBlockedMessage(input: {
  removedAt: Date | null;
  requirementStatus: import("@prisma/client").RequirementStatus;
  resolutionStatus: import("@prisma/client").RequirementResolutionStatus;
  responseMode: import("@prisma/client").RequirementResponseMode;
  canRespondAuth: boolean;
}): string | null {
  if (input.resolutionStatus === "RESOLVED") {
    return null;
  }
  if (input.removedAt) {
    return "Du bist nicht mehr Empfänger dieser Anforderung.";
  }
  if (!input.canRespondAuth) {
    return "Du darfst diese Anforderung nicht bestätigen.";
  }
  if (input.requirementStatus === "CLOSED") {
    return "Diese Anforderung ist abgeschlossen und nimmt keine Antworten mehr entgegen.";
  }
  if (input.requirementStatus === "CANCELLED") {
    return "Diese Anforderung wurde abgebrochen.";
  }
  if (input.requirementStatus !== "ACTIVE") {
    return "Diese Anforderung ist derzeit nicht aktiv.";
  }
  if (input.responseMode !== "ACKNOWLEDGE") {
    return "Dieser Antworttyp wird hier noch nicht unterstützt.";
  }
  return null;
}

export async function loadPersonalRequirementExecutionView(
  ctx: RequirementServiceContext,
  recipientId: string,
  locale: string,
  timeZone: string,
  now: Date = new Date(),
): Promise<PersonalRequirementExecutionView> {
  const row = await prisma.requirementRecipient.findFirst({
    where: { id: recipientId, tenantId: ctx.tenantId },
    include: {
      requirement: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          responseMode: true,
          dueAt: true,
          createdAt: true,
          activatedAt: true,
          createdByUserId: true,
        },
      },
      subjectPerson: {
        select: { id: true, displayName: true, firstName: true, lastName: true },
      },
      responseActorPerson: {
        select: { id: true, displayName: true, firstName: true, lastName: true },
      },
    },
  });

  if (!row) {
    throw new RequirementRecipientNotFoundError(recipientId);
  }

  const authorizedSubjectPersonIds = await getAuthorizedPersonIdsForUser(ctx.tenantId, ctx.userId);
  const authRecord = {
    tenantId: row.tenantId,
    requirementId: row.requirementId,
    subjectPersonId: row.subjectPersonId,
    removedAt: row.removedAt,
  };

  if (!canReadOwnRequirementRecipient(ctx, authRecord, authorizedSubjectPersonIds)) {
    throw new RequirementForbiddenError();
  }

  const [linkedPerson, creatorLabel] = await Promise.all([
    prisma.person.findFirst({
      where: { tenantId: ctx.tenantId, userId: ctx.userId },
      select: { id: true },
    }),
    resolveRequirementCreatorLabel(ctx.tenantId, row.requirement.createdByUserId),
  ]);

  const subjectDisplayName = formatPersonDisplayName(row.subjectPerson);
  const actingForOtherPerson =
    linkedPerson?.id != null && linkedPerson.id !== row.subjectPersonId;
  const responseActorDisplayName = row.responseActorPerson
    ? formatPersonDisplayName(row.responseActorPerson)
    : null;

  const canRespondAuth = canRespondToRequirementRecipient(
    ctx,
    authRecord,
    authorizedSubjectPersonIds,
  );

  const managementStatus = resolveRequirementRecipientManagementStatus({
    requirementStatus: row.requirement.status,
    dueAt: row.requirement.dueAt,
    resolutionStatus: row.resolutionStatus,
    removedAt: row.removedAt,
    now,
  });

  const deadlinePresentation = presentTaskDeadline({
    dueAt: row.requirement.dueAt?.toISOString() ?? null,
    status: row.resolutionStatus === "RESOLVED" ? TaskStatus.DONE : TaskStatus.OPEN,
    locale,
    timeZone,
    now,
  });

  const respondBlockedMessage = resolveRespondBlockedMessage({
    removedAt: row.removedAt,
    requirementStatus: row.requirement.status,
    resolutionStatus: row.resolutionStatus,
    responseMode: row.requirement.responseMode,
    canRespondAuth,
  });

  const canRespond =
    respondBlockedMessage === null &&
    row.resolutionStatus === "OPEN" &&
    row.requirement.status === "ACTIVE" &&
    row.requirement.responseMode === "ACKNOWLEDGE";

  const recipient = mapRecipientRow(row);

  return {
    recipient,
    personalActionId: buildRequirementPersonalActionId(recipient.id),
    requirement: {
      id: row.requirement.id,
      title: row.requirement.title,
      description: row.requirement.description,
      status: row.requirement.status,
      responseMode: row.requirement.responseMode,
      dueAt: row.requirement.dueAt?.toISOString() ?? null,
      createdAt: row.requirement.createdAt.toISOString(),
      activatedAt: row.requirement.activatedAt?.toISOString() ?? null,
    },
    subjectDisplayName,
    actingForOtherPerson,
    creatorLabel,
    responseActorDisplayName,
    managementStatus,
    deadlinePresentation,
    responseLabel:
      recipient.resolutionStatus === "RESOLVED"
        ? formatRecipientResponseLabel(recipient.responseValue)
        : null,
    respondedActingForLabel:
      recipient.resolutionStatus === "RESOLVED"
        ? formatActingForLabel({
            subjectPersonId: recipient.subjectPersonId,
            responseActorPersonId: recipient.responseActorPersonId,
            subjectDisplayName,
            actorDisplayName: responseActorDisplayName,
          })
        : null,
    canRespond,
    respondBlockedMessage,
  };
}
