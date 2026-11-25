import {
  ClubMeldungHistoryEventType,
  ClubMeldungMessageAudience,
  ClubMeldungStatus,
  type ClubMeldungCategory,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { allocateClubMeldungCaseNumber } from "./case-number";
import {
  allocateSceRecordReferenceFields,
  linkTenantRecordPublicReference,
} from "@/lib/tenant-public-reference/sce-tenant-record-reference-allocation";
import { resolveMeldungPublicReferenceDisplay } from "@/lib/tenant-public-reference/sce-meldung-public-reference";
import { loadTenantPublicReferenceShortCode } from "@/lib/tenant-public-reference/sce-tenant-public-reference";
import { SceTenantPublicRecordKind } from "@prisma/client";
import { assertAttachmentLinkableForMeldung } from "./attachment-link";
import { recordClubMeldungHistory } from "./history-service";
import {
  emitMeldungAssignedNotification,
  emitMeldungReporterReplyNotification,
  emitMeldungResolvedNotification,
} from "./notification-producer";
import { MAX_CLUB_MELDUNG_MESSAGE_BODY_LENGTH } from "./constants";
import { validateMentionedUsersForMeldung } from "./meldung-mention-auth";
import { emitMeldungMentionNotifications } from "./meldung-mention-producer";
import { mentionExcerpt, meldungMentionDisplayName } from "./meldung-mention-tokens";
import {
  canMutateMeldungInternal,
  canViewMeldung,
  type ClubMeldungAccessContext,
} from "./access";

export class ClubMeldungServiceError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "CONFLICT"
      | "VALIDATION"
      | "INACTIVE_ASSIGNEE",
  ) {
    super(message);
    this.name = "ClubMeldungServiceError";
  }
}

export type CreateClubMeldungInput = {
  tenantId: string;
  reporterUserId: string;
  subject: string;
  description: string;
  category: ClubMeldungCategory;
  locationHint?: string | null;
  urgent?: boolean;
  urgentNote?: string | null;
  idempotencyKey: string;
  attachmentIds?: string[];
};

function resolveMeldungPublicReferenceFromRow(
  row: {
    caseNumber: string;
    scePublicNumber: bigint | null;
    tenantPublicNumber: bigint | null;
  },
  tenantShortCode: string | null,
): string {
  return resolveMeldungPublicReferenceDisplay({
    tenantShortCode,
    tenantPublicNumber: row.tenantPublicNumber,
    scePublicNumber: row.scePublicNumber,
    caseNumber: row.caseNumber,
  });
}

async function assertActiveTenantMember(tenantId: string, userId: string): Promise<void> {
  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenantId,
      userId,
      isActive: true,
      user: { isActive: true },
    },
    select: { id: true },
  });
  if (!membership) {
    throw new ClubMeldungServiceError("Inactive or missing membership", "FORBIDDEN");
  }
}

export async function createClubMeldung(input: CreateClubMeldungInput) {
  await assertActiveTenantMember(input.tenantId, input.reporterUserId);

  const existingIdem = await prisma.clubMeldungCreateIdempotency.findUnique({
    where: {
      tenantId_reporterUserId_idempotencyKey: {
        tenantId: input.tenantId,
        reporterUserId: input.reporterUserId,
        idempotencyKey: input.idempotencyKey,
      },
    },
    include: { meldung: true },
  });
  if (existingIdem) {
    const shortCode = await loadTenantPublicReferenceShortCode(prisma, input.tenantId);
    const publicReference = resolveMeldungPublicReferenceFromRow(existingIdem.meldung, shortCode);
    return { meldung: existingIdem.meldung, created: false as const, publicReference };
  }

  if (input.urgent && !input.urgentNote?.trim()) {
    throw new ClubMeldungServiceError("Dringend erfordert eine kurze Erläuterung", "VALIDATION");
  }

  const tenantShortCode = await loadTenantPublicReferenceShortCode(prisma, input.tenantId);

  const meldung = await prisma.$transaction(async (tx) => {
    const createdAt = new Date();
    const caseNumber = await allocateClubMeldungCaseNumber(tx, input.tenantId, {
      createdAt,
    });
    const refs = await allocateSceRecordReferenceFields(tx, input.tenantId);
    const row = await tx.clubMeldung.create({
      data: {
        tenantId: input.tenantId,
        caseNumber,
        scePublicNumber: refs.scePublicNumber,
        tenantPublicNumber: refs.tenantPublicNumber,
        subject: input.subject.trim(),
        description: input.description.trim(),
        category: input.category,
        locationHint: input.locationHint?.trim() || null,
        urgent: Boolean(input.urgent),
        urgentNote: input.urgent ? input.urgentNote?.trim() || null : null,
        reporterUserId: input.reporterUserId,
        status: ClubMeldungStatus.RECEIVED,
        createdAt,
        lastActivityAt: createdAt,
      },
    });

    await recordClubMeldungHistory(tx, {
      tenantId: input.tenantId,
      meldungId: row.id,
      eventType: ClubMeldungHistoryEventType.CREATED,
      actorUserId: input.reporterUserId,
      payloadJson: { caseNumber },
    });

    await tx.clubMeldungCreateIdempotency.create({
      data: {
        tenantId: input.tenantId,
        reporterUserId: input.reporterUserId,
        idempotencyKey: input.idempotencyKey,
        meldungId: row.id,
      },
    });

    if (input.attachmentIds?.length) {
      await linkAttachmentsTx(tx, {
        tenantId: input.tenantId,
        meldungId: row.id,
        uploadedByUserId: input.reporterUserId,
        attachmentIds: input.attachmentIds,
      });
    }

    if (refs.tenantPublicNumber != null) {
      await linkTenantRecordPublicReference(tx, {
        tenantId: input.tenantId,
        tenantPublicNumber: refs.tenantPublicNumber,
        recordKind: SceTenantPublicRecordKind.MELDUNG,
        entityId: row.id,
      });
    }

    return row;
  });

  return {
    meldung,
    created: true as const,
    publicReference: resolveMeldungPublicReferenceFromRow(meldung, tenantShortCode),
  };
}

async function linkAttachmentsTx(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    meldungId: string;
    uploadedByUserId: string;
    attachmentIds: string[];
  },
) {
  for (const communicationAttachmentId of input.attachmentIds) {
    try {
      await assertAttachmentLinkableForMeldung(tx, {
        tenantId: input.tenantId,
        uploaderUserId: input.uploadedByUserId,
        communicationAttachmentId,
        targetMeldungId: input.meldungId,
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "VALIDATION";
      if (code === "ATTACHMENT_ALREADY_LINKED") {
        throw new ClubMeldungServiceError(
          "Anhang ist bereits einer anderen Meldung zugeordnet",
          "CONFLICT",
        );
      }
      throw new ClubMeldungServiceError("Anhang nicht gefunden oder nicht bereit", "VALIDATION");
    }
    await tx.clubMeldungAttachment.create({
      data: {
        tenantId: input.tenantId,
        meldungId: input.meldungId,
        communicationAttachmentId,
        uploadedByUserId: input.uploadedByUserId,
      },
    });
  }
}

export type AssignClubMeldungInput = {
  tenantId: string;
  meldungId: string;
  actorUserId: string;
  accountableUserId: string | null;
  orgUnitId?: string | null;
  collaboratorUserIds?: string[];
  awaitedExternalParty?: string | null;
  expectedVersion: number;
};

export async function assignClubMeldung(input: AssignClubMeldungInput) {
  if (input.accountableUserId) {
    await assertActiveTenantMember(input.tenantId, input.accountableUserId);
  }
  if (input.orgUnitId) {
    const orgUnit = await prisma.orgUnit.findFirst({
      where: {
        id: input.orgUnitId,
        tenantId: input.tenantId,
        status: { not: "ARCHIVED" },
      },
      select: { id: true },
    });
    if (!orgUnit) {
      throw new ClubMeldungServiceError("Organisationseinheit ungültig", "VALIDATION");
    }
  }
  for (const userId of input.collaboratorUserIds ?? []) {
    await assertActiveTenantMember(input.tenantId, userId);
  }

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.clubMeldung.findFirst({
      where: { id: input.meldungId, tenantId: input.tenantId },
    });
    if (!current) throw new ClubMeldungServiceError("Meldung nicht gefunden", "NOT_FOUND");
    if (current.version !== input.expectedVersion) {
      throw new ClubMeldungServiceError("Zwischenzeitlich geändert — bitte neu laden", "CONFLICT");
    }

    const prevAccountable = current.accountableUserId;
    const updated = await tx.clubMeldung.update({
      where: { id: current.id },
      data: {
        accountableUserId: input.accountableUserId,
        orgUnitId: input.orgUnitId ?? current.orgUnitId,
        awaitedExternalParty: input.awaitedExternalParty ?? current.awaitedExternalParty,
        version: { increment: 1 },
        lastActivityAt: new Date(),
        ...(input.accountableUserId &&
        current.status === ClubMeldungStatus.RECEIVED
          ? { status: ClubMeldungStatus.IN_PROGRESS }
          : {}),
      },
    });

    if (input.collaboratorUserIds) {
      await tx.clubMeldungCollaborator.deleteMany({ where: { meldungId: current.id } });
      for (const userId of input.collaboratorUserIds) {
        await tx.clubMeldungCollaborator.create({
          data: {
            meldungId: current.id,
            userId,
            addedByUserId: input.actorUserId,
          },
        });
        await recordClubMeldungHistory(tx, {
          tenantId: input.tenantId,
          meldungId: current.id,
          eventType: ClubMeldungHistoryEventType.COLLABORATOR_ADDED,
          actorUserId: input.actorUserId,
          payloadJson: { userId },
        });
      }
    }

    const eventType =
      prevAccountable && prevAccountable !== input.accountableUserId
        ? ClubMeldungHistoryEventType.REASSIGNED
        : ClubMeldungHistoryEventType.ASSIGNED;

    await recordClubMeldungHistory(tx, {
      tenantId: input.tenantId,
      meldungId: current.id,
      eventType,
      actorUserId: input.actorUserId,
      payloadJson: {
        fromUserId: prevAccountable,
        toUserId: input.accountableUserId,
        orgUnitId: input.orgUnitId ?? current.orgUnitId,
      },
    });

    if (input.accountableUserId && input.accountableUserId !== prevAccountable) {
      await emitMeldungAssignedNotification(tx, {
        tenantId: input.tenantId,
        meldungId: current.id,
        caseNumber: current.caseNumber,
        subject: current.subject,
        assigneeUserId: input.accountableUserId,
        actorUserId: input.actorUserId,
      });
    }

    return updated;
  });

  return result;
}

export type UpdateClubMeldungStatusInput = {
  tenantId: string;
  meldungId: string;
  actorUserId: string;
  status: ClubMeldungStatus;
  waitReason?: string | null;
  resolutionSummary?: string | null;
  reopenReason?: string | null;
  expectedVersion: number;
  nextStep?: string | null;
  followUpAt?: Date | null;
  nextFeedbackAt?: Date | null;
};

export async function updateClubMeldungStatus(input: UpdateClubMeldungStatusInput) {
  if (input.status === ClubMeldungStatus.WAITING && !input.waitReason?.trim()) {
    throw new ClubMeldungServiceError("Wartegrund erforderlich", "VALIDATION");
  }
  if (input.status === ClubMeldungStatus.DONE && !input.resolutionSummary?.trim()) {
    throw new ClubMeldungServiceError("Erledigt erfordert eine Zusammenfassung", "VALIDATION");
  }
  if (
    input.status !== ClubMeldungStatus.DONE &&
    input.reopenReason === undefined &&
    input.status === ClubMeldungStatus.RECEIVED
  ) {
    // reopen path handled below when reopenReason provided
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.clubMeldung.findFirst({
      where: { id: input.meldungId, tenantId: input.tenantId },
    });
    if (!current) throw new ClubMeldungServiceError("Meldung nicht gefunden", "NOT_FOUND");
    if (current.version !== input.expectedVersion) {
      throw new ClubMeldungServiceError("Zwischenzeitlich geändert — bitte neu laden", "CONFLICT");
    }

    const reopening =
      current.status === ClubMeldungStatus.DONE &&
      input.status !== ClubMeldungStatus.DONE &&
      Boolean(input.reopenReason?.trim());

    if (reopening && !input.reopenReason?.trim()) {
      throw new ClubMeldungServiceError("Wiedereröffnen erfordert einen Grund", "VALIDATION");
    }

    const updated = await tx.clubMeldung.update({
      where: { id: current.id },
      data: {
        status: input.status,
        waitReason:
          input.status === ClubMeldungStatus.WAITING
            ? input.waitReason?.trim() || null
            : current.waitReason,
        resolutionSummary:
          input.status === ClubMeldungStatus.DONE
            ? input.resolutionSummary?.trim() || null
            : reopening
              ? null
              : current.resolutionSummary,
        reopenReason: reopening ? input.reopenReason?.trim() || null : current.reopenReason,
        nextStep: input.nextStep !== undefined ? input.nextStep : current.nextStep,
        followUpAt: input.followUpAt !== undefined ? input.followUpAt : current.followUpAt,
        nextFeedbackAt:
          input.nextFeedbackAt !== undefined ? input.nextFeedbackAt : current.nextFeedbackAt,
        resolvedAt: input.status === ClubMeldungStatus.DONE ? new Date() : reopening ? null : current.resolvedAt,
        version: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });

    if (reopening) {
      await recordClubMeldungHistory(tx, {
        tenantId: input.tenantId,
        meldungId: current.id,
        eventType: ClubMeldungHistoryEventType.REOPENED,
        actorUserId: input.actorUserId,
        payloadJson: { reason: input.reopenReason },
      });
    } else if (input.status === ClubMeldungStatus.WAITING) {
      await recordClubMeldungHistory(tx, {
        tenantId: input.tenantId,
        meldungId: current.id,
        eventType: ClubMeldungHistoryEventType.WAIT_REASON_SET,
        actorUserId: input.actorUserId,
        payloadJson: { waitReason: input.waitReason },
      });
    } else if (input.status === ClubMeldungStatus.DONE) {
      await recordClubMeldungHistory(tx, {
        tenantId: input.tenantId,
        meldungId: current.id,
        eventType: ClubMeldungHistoryEventType.RESOLUTION_RECORDED,
        actorUserId: input.actorUserId,
        payloadJson: { resolutionSummary: input.resolutionSummary },
      });
      await emitMeldungResolvedNotification(tx, {
        tenantId: input.tenantId,
        meldungId: current.id,
        caseNumber: current.caseNumber,
        subject: current.subject,
        reporterUserId: current.reporterUserId,
        actorUserId: input.actorUserId,
      });
    } else {
      await recordClubMeldungHistory(tx, {
        tenantId: input.tenantId,
        meldungId: current.id,
        eventType: ClubMeldungHistoryEventType.STATUS_CHANGED,
        actorUserId: input.actorUserId,
        payloadJson: { from: current.status, to: input.status },
      });
    }

    return updated;
  });
}

export type PostClubMeldungMessageInput = {
  tenantId: string;
  meldungId: string;
  actorUserId: string;
  audience: ClubMeldungMessageAudience;
  body: string;
  asReporter?: boolean;
  mentionedUserIds?: string[];
  tenantKey?: string;
};

export async function postClubMeldungMessage(input: PostClubMeldungMessageInput) {
  const body = input.body.trim();
  if (!body) throw new ClubMeldungServiceError("Nachricht darf nicht leer sein", "VALIDATION");
  if (body.length > MAX_CLUB_MELDUNG_MESSAGE_BODY_LENGTH) {
    throw new ClubMeldungServiceError("Nachricht ist zu lang", "VALIDATION");
  }

  if (input.asReporter && (input.mentionedUserIds?.length ?? 0) > 0) {
    throw new ClubMeldungServiceError("Erwähnungen sind nur in internen Kommentaren möglich", "VALIDATION");
  }
  if (
    input.audience !== ClubMeldungMessageAudience.INTERNAL_NOTE &&
    (input.mentionedUserIds?.length ?? 0) > 0
  ) {
    throw new ClubMeldungServiceError("Erwähnungen sind nur in internen Kommentaren möglich", "VALIDATION");
  }

  const validatedMentions =
    input.audience === ClubMeldungMessageAudience.INTERNAL_NOTE
      ? await validateMentionedUsersForMeldung({
          tenantId: input.tenantId,
          meldungId: input.meldungId,
          body,
          mentionedUserIds: input.mentionedUserIds ?? [],
        })
      : [];

  return prisma.$transaction(async (tx) => {
    const meldung = await tx.clubMeldung.findFirst({
      where: { id: input.meldungId, tenantId: input.tenantId },
    });
    if (!meldung) throw new ClubMeldungServiceError("Meldung nicht gefunden", "NOT_FOUND");

    if (input.asReporter && meldung.reporterUserId !== input.actorUserId) {
      throw new ClubMeldungServiceError("Nur die meldende Person kann hier antworten", "FORBIDDEN");
    }
    if (input.asReporter && input.audience !== ClubMeldungMessageAudience.REPORTER_REPLY) {
      throw new ClubMeldungServiceError("Ungültige Nachrichtenart", "VALIDATION");
    }

    const message = await tx.clubMeldungMessage.create({
      data: {
        tenantId: input.tenantId,
        meldungId: input.meldungId,
        audience: input.audience,
        body,
        authorUserId: input.actorUserId,
        mentions:
          validatedMentions.length > 0
            ? {
                create: validatedMentions.map((userId) => ({
                  tenantId: input.tenantId,
                  userId,
                })),
              }
            : undefined,
      },
    });

    await tx.clubMeldung.update({
      where: { id: meldung.id },
      data: { lastActivityAt: new Date() },
    });

    const eventType =
      input.audience === ClubMeldungMessageAudience.INTERNAL_NOTE
        ? ClubMeldungHistoryEventType.FIELD_UPDATED
        : input.asReporter
          ? ClubMeldungHistoryEventType.REPORTER_MESSAGE
          : ClubMeldungHistoryEventType.HANDLER_MESSAGE_TO_REPORTER;

    await recordClubMeldungHistory(tx, {
      tenantId: input.tenantId,
      meldungId: input.meldungId,
      eventType,
      actorUserId: input.actorUserId,
      payloadJson: { messageId: message.id, audience: input.audience },
    });

    if (
      input.audience === ClubMeldungMessageAudience.REPORTER_REPLY &&
      !input.asReporter &&
      meldung.accountableUserId
    ) {
      await emitMeldungReporterReplyNotification(tx, {
        tenantId: input.tenantId,
        meldungId: meldung.id,
        caseNumber: meldung.caseNumber,
        subject: meldung.subject,
        reporterUserId: meldung.reporterUserId,
        actorUserId: input.actorUserId,
      });
    }

    if (validatedMentions.length > 0) {
      const author = await tx.user.findUnique({
        where: { id: input.actorUserId },
        select: { firstName: true, lastName: true },
      });
      const actorDisplayName = author
        ? meldungMentionDisplayName(author.firstName, author.lastName)
        : "Bearbeiter";
      const tenantKey =
        input.tenantKey ??
        (await tx.tenant.findUnique({ where: { id: input.tenantId }, select: { key: true } }))?.key ??
        input.tenantId;

      await emitMeldungMentionNotifications(tx, {
        tenantId: input.tenantId,
        tenantKey,
        meldungId: meldung.id,
        caseNumber: meldung.caseNumber,
        messageId: message.id,
        commentExcerpt: mentionExcerpt(body),
        actorUserId: input.actorUserId,
        actorDisplayName,
        mentionedUserIds: validatedMentions,
      });
    }

    return message;
  });
}

export async function markClubMeldungDuplicate(input: {
  tenantId: string;
  meldungId: string;
  duplicateOfId: string;
  actorUserId: string;
  expectedVersion: number;
  permissionKeys: readonly string[];
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.clubMeldung.findFirst({
      where: { id: input.meldungId, tenantId: input.tenantId },
      include: { collaborators: { select: { userId: true } } },
    });
    if (!current) throw new ClubMeldungServiceError("Meldung nicht gefunden", "NOT_FOUND");
    if (current.version !== input.expectedVersion) {
      throw new ClubMeldungServiceError("Zwischenzeitlich geändert", "CONFLICT");
    }

    const currentCtx: ClubMeldungAccessContext = {
      actorUserId: input.actorUserId,
      permissionKeys: input.permissionKeys,
      collaboratorUserIds: current.collaborators.map((c) => c.userId),
    };
    if (!canMutateMeldungInternal(current, currentCtx)) {
      throw new ClubMeldungServiceError("Keine Berechtigung", "FORBIDDEN");
    }

    const canonical = await tx.clubMeldung.findFirst({
      where: { id: input.duplicateOfId, tenantId: input.tenantId },
      include: { collaborators: { select: { userId: true } } },
    });
    if (!canonical) throw new ClubMeldungServiceError("Verknüpfte Meldung nicht gefunden", "NOT_FOUND");

    const canonicalCtx: ClubMeldungAccessContext = {
      actorUserId: input.actorUserId,
      permissionKeys: input.permissionKeys,
      collaboratorUserIds: canonical.collaborators.map((c) => c.userId),
    };
    if (!canViewMeldung(canonical, canonicalCtx)) {
      throw new ClubMeldungServiceError("Verknüpfte Meldung nicht sichtbar", "FORBIDDEN");
    }

    const updated = await tx.clubMeldung.update({
      where: { id: current.id },
      data: {
        duplicateOfId: canonical.id,
        version: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });

    await recordClubMeldungHistory(tx, {
      tenantId: input.tenantId,
      meldungId: current.id,
      eventType: ClubMeldungHistoryEventType.DUPLICATE_MARKED,
      actorUserId: input.actorUserId,
      payloadJson: { duplicateOfId: canonical.id, caseNumber: canonical.caseNumber },
    });

    return updated;
  });
}