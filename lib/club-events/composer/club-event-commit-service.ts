import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createClubEventFromRequest } from "@/lib/events/club-event-create-service";
import { clubEventOrganisationalAudienceEditorToApiPayload } from "@/components/admin/veranstaltungen/ClubEventOrganisationalAudienceEditor";
import { recurrenceValuesToApiPayload } from "@/components/admin/veranstaltungen/VeranstaltungRecurrenceFields";
import { parseClubEventScheduleInput } from "@/lib/events/club-event-scheduling";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import type { ClubEventComposerDraftPayload } from "./club-event-composer-draft-types";
import { validateActivityGovernanceConfiguration } from "@/lib/sce/activity-governance/configuration-validation";

export type ClubEventCommitResult =
  | { outcome: "PUBLISHED"; eventIds: string[]; seriesId: string | null }
  | { outcome: "SUBMITTED_FOR_APPROVAL"; draftId: string; revisionId: string };

function buildFacilityResourceIds(payload: ClubEventComposerDraftPayload): string[] {
  return payload.resources.map((r) => r.facilityResourceId).filter(Boolean);
}

function operationalPublicationFlags(payload: ClubEventComposerDraftPayload, active: boolean) {
  if (!active) {
    return {
      websiteVisible: false,
      infoboardVisible: false,
      homepageVisible: false,
      wochenplanVisible: false,
      trainingsplanVisible: false,
      teamPageVisible: false,
    };
  }
  return {
    websiteVisible: payload.ausspielung.websiteVisible,
    infoboardVisible: false,
    homepageVisible: payload.ausspielung.homepageVisible,
    wochenplanVisible: payload.ausspielung.wochenplanVisible,
    trainingsplanVisible: false,
    teamPageVisible: false,
  };
}

export async function commitClubEventComposerDraft(input: {
  tenantId: string;
  actorUserId: string | null;
  actorPersonId: string;
  timezone: string;
  payload: ClubEventComposerDraftPayload;
  draftId?: string | null;
  effectiveGovernance: SceActivityEffectiveGovernance;
}): Promise<ClubEventCommitResult> {
  const pub = operationalPublicationFlags(
    input.payload,
    input.effectiveGovernance.publicationAuthority === "DIRECT_PUBLISH",
  );

  if (input.effectiveGovernance.publicationAuthority === "APPROVAL_REQUIRED") {
    const configIssues = validateActivityGovernanceConfiguration({
      tenantId: input.tenantId,
      activityTypes: [
        {
          activityType: "CLUB_EVENT",
          defaultPublicationAuthority: "APPROVAL_REQUIRED",
          validatorPersonIds: input.effectiveGovernance.validatorPersonIds,
          creatorPolicies: [
            {
              personId: input.actorPersonId,
              publicationAuthority: "APPROVAL_REQUIRED",
            },
          ],
        },
      ],
    });
    if (configIssues.length > 0) {
      throw new Error(
        "Freigabe ist nicht möglich: Für Veranstaltungen ist kein berechtigter Validator konfiguriert.",
      );
    }

    const policySnapshot = {
      publicationAuthority: input.effectiveGovernance.publicationAuthority,
      validatorPersonIds: input.effectiveGovernance.validatorPersonIds,
    } satisfies Prisma.InputJsonValue;

    const result = await prisma.$transaction(async (tx) => {
      let draftId = input.draftId ?? null;
      if (draftId) {
        await tx.clubEventComposerDraft.updateMany({
          where: {
            id: draftId,
            tenantId: input.tenantId,
            lifecycleState: { in: ["DRAFT", "CHANGES_REQUESTED"] },
          },
          data: {
            payload: input.payload as unknown as Prisma.InputJsonValue,
            draftResourceSelections: input.payload.resources as unknown as Prisma.InputJsonValue,
            lifecycleState: "PENDING_APPROVAL",
            submittedAt: new Date(),
            updatedByPersonId: input.actorPersonId,
            revisionNumber: { increment: 1 },
          },
        });
      } else {
        const created = await tx.clubEventComposerDraft.create({
          data: {
            tenantId: input.tenantId,
            createdByPersonId: input.actorPersonId,
            updatedByPersonId: input.actorPersonId,
            lifecycleState: "PENDING_APPROVAL",
            payload: input.payload as unknown as Prisma.InputJsonValue,
            draftResourceSelections: input.payload.resources as unknown as Prisma.InputJsonValue,
            submittedAt: new Date(),
            revisionNumber: 1,
          },
        });
        draftId = created.id;
      }

      const draft = await tx.clubEventComposerDraft.findFirstOrThrow({
        where: { id: draftId!, tenantId: input.tenantId },
      });

      await tx.sceActivityGovernanceRevision.updateMany({
        where: { clubEventDraftId: draft.id, isCurrentSubmission: true },
        data: { isCurrentSubmission: false },
      });

      const revision = await tx.sceActivityGovernanceRevision.create({
        data: {
          tenantId: input.tenantId,
          activityType: "CLUB_EVENT",
          clubEventDraftId: draft.id,
          revisionNumber: draft.revisionNumber,
          lifecycleState: "PENDING_APPROVAL",
          creatorPersonId: input.actorPersonId,
          submittedAt: new Date(),
          policySnapshot,
          payloadSnapshot: input.payload as unknown as Prisma.InputJsonValue,
          isCurrentSubmission: true,
        },
      });

      return { draftId: draft.id, revisionId: revision.id };
    });

    return {
      outcome: "SUBMITTED_FOR_APPROVAL",
      draftId: result.draftId,
      revisionId: result.revisionId,
    };
  }

  const schedule = parseClubEventScheduleInput(
    {
      allDay: input.payload.schedule.allDay,
      startDate: input.payload.schedule.startDate,
      endDate: input.payload.schedule.endDate || null,
      startTime: input.payload.schedule.startTime,
      endTime: input.payload.schedule.endTime,
    },
    input.timezone,
  );

  const audiencePayload = clubEventOrganisationalAudienceEditorToApiPayload(input.payload.audience);
  const recurrencePayload = recurrenceValuesToApiPayload(
    input.payload.schedule,
    input.payload.recurrence,
  );

  const createResult = await createClubEventFromRequest({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    seasonId: input.payload.seasonId,
    title: input.payload.title.trim(),
    description: input.payload.description.trim() || null,
    location: input.payload.location.trim() || null,
    organizerName: input.payload.organizerName.trim() || null,
    remarks: input.payload.remarks.trim() || null,
    source: "MANUAL",
    status: "SCHEDULED",
    reviewStage: "PUBLISHED",
    reviewRequestedAt: null,
    reviewedAt: new Date(),
    reviewedByUserId: input.actorUserId,
    approvedByUserId: input.actorUserId,
    ...pub,
    sortOrder: 0,
    audience: audiencePayload,
    scheduleBody: {
      allDay: input.payload.schedule.allDay,
      startDate: input.payload.schedule.startDate,
      endDate: input.payload.schedule.endDate || null,
      startTime: input.payload.schedule.startTime,
      endTime: input.payload.schedule.endTime,
      startAt: schedule.startAt.toISOString(),
      endAt: schedule.endAt?.toISOString() ?? null,
    },
    recurrenceBody: recurrencePayload,
    facilityResourceIds: buildFacilityResourceIds(input.payload),
    timezone: input.timezone,
  });

  if (input.draftId) {
    await prisma.clubEventComposerDraft.updateMany({
      where: { id: input.draftId, tenantId: input.tenantId },
      data: {
        lifecycleState: "PUBLISHED",
        publishedPrimaryEventId: createResult.eventIds[0] ?? null,
      },
    });
  }

  return {
    outcome: "PUBLISHED",
    eventIds: createResult.eventIds,
    seriesId: createResult.seriesId,
  };
}
