/**
 * SCE-CLUB-EVENT-AUDIENCE-01-R1 — club event (OTHER) create orchestration.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { parseClubEventScheduleFromApiBody } from "@/lib/events/club-event-api-scheduling";
import { parseClubEventRecurrenceFromApiBody } from "@/lib/events/club-event-recurrence-api";
import { generateClubEventOccurrences } from "@/lib/events/club-event-recurrence";
import {
  formatClubEventSeriesResourceConflictMessage,
  validateClubEventSeriesResourceAssignments,
} from "@/lib/events/club-event-series-resource-validation";
import {
  persistClubEventOrganisationalAudienceInTransaction,
  prepareClubEventOrganisationalAudienceWrite,
} from "@/lib/events/club-event-organisational-audience-service";
import type { ClubEventOrganisationalAudienceInput } from "@/lib/events/club-event-organisational-audience-types";
import { assignEventFacilityResource } from "@/lib/events/event-facility-allocation-service";
import { ClubEventValidationError } from "@/lib/events/club-events-service";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";

export type CreateClubEventRequest = {
  tenantId: string;
  actorUserId: string | null;
  seasonId: string;
  title: string;
  description: string | null;
  location: string | null;
  organizerName: string | null;
  remarks: string | null;
  source: "MANUAL" | "CLUBCORNER_FVNWS" | "CSV_EXCEL_IMPORT";
  status: string;
  reviewStage: string;
  reviewRequestedAt: Date | null;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
  approvedByUserId: string | null;
  websiteVisible: boolean;
  infoboardVisible: boolean;
  homepageVisible: boolean;
  wochenplanVisible: boolean;
  trainingsplanVisible: boolean;
  teamPageVisible: boolean;
  sortOrder: number;
  audience?: ClubEventOrganisationalAudienceInput;
  scheduleBody: {
    allDay: boolean;
    startDate?: string;
    endDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    startAt?: string;
    endAt?: string | null;
  };
  recurrenceBody: unknown;
  facilityResourceIds?: string[];
  timezone: string;
};

export type CreateClubEventResult = {
  eventIds: string[];
  seriesId: string | null;
  occurrenceCount: number;
};

export async function createClubEventFromRequest(
  input: CreateClubEventRequest,
): Promise<CreateClubEventResult> {
  const tenantTimeZone = resolveTenantEventTimezone(input.timezone);
  const schedule = parseClubEventScheduleFromApiBody(input.scheduleBody, tenantTimeZone);

  const startDate =
    input.scheduleBody.startDate ??
    schedule.startAt.toISOString().slice(0, 10);

  const recurrence = parseClubEventRecurrenceFromApiBody(input.recurrenceBody, {
    allDay: schedule.allDay,
    startDate,
    startTime: input.scheduleBody.startTime ?? null,
    endTime: input.scheduleBody.endTime ?? null,
    timezone: tenantTimeZone,
  });

  const audiencePrepared = input.audience
    ? await prepareClubEventOrganisationalAudienceWrite(input.tenantId, input.audience)
    : null;

  const audienceScope = audiencePrepared?.normalized.scope ?? "CLUB_WIDE";
  const audienceTeamIds =
    audiencePrepared?.labeledTargets.filter((t) => t.kind === "TEAM").map((t) => t.id) ?? [];
  const audienceOrgUnitIds =
    audiencePrepared?.labeledTargets.filter((t) => t.kind === "ORG_UNIT").map((t) => t.id) ?? [];

  const facilityResourceIds = (input.facilityResourceIds ?? []).filter(Boolean);

  if (!recurrence.enabled) {
    const created = await prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: buildEventCreateData(input, {
          startAt: schedule.startAt,
          endAt: schedule.endAt,
          allDay: schedule.allDay,
          seriesId: null,
          occurrenceDateKey: null,
          scope: audienceScope,
        }),
      });

      if (audiencePrepared) {
        await persistClubEventOrganisationalAudienceInTransaction(
          tx,
          input.tenantId,
          event.id,
          audiencePrepared,
        );
      }

      return [event];
    });

    await assignResourcesToFirstEvent(input.tenantId, created[0]!.id, facilityResourceIds);

    return {
      eventIds: created.map((e) => e.id),
      seriesId: null,
      occurrenceCount: 1,
    };
  }

  const occurrences = generateClubEventOccurrences(recurrence.rule);

  if (facilityResourceIds.length > 0) {
    const validation = await validateClubEventSeriesResourceAssignments({
      tenantId: input.tenantId,
      occurrences,
      facilityResourceIds,
    });
    if (validation.conflictingOccurrences.length > 0) {
      throw new ClubEventValidationError(
        formatClubEventSeriesResourceConflictMessage(validation),
        "resources",
      );
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const series = await tx.clubEventSeries.create({
      data: {
        tenantId: input.tenantId,
        seasonId: input.seasonId,
        title: input.title,
        description: input.description,
        location: input.location,
        organizerName: input.organizerName,
        remarks: input.remarks,
        frequency: recurrence.rule.frequency,
        intervalCount: recurrence.rule.intervalCount,
        weekday: recurrence.rule.weekday,
        monthlyPatternKind: recurrence.rule.monthlyPatternKind,
        monthDay: recurrence.rule.monthDay,
        monthOrdinal: recurrence.rule.monthOrdinal,
        allDay: recurrence.rule.allDay,
        startsAtTime: recurrence.rule.startsAtTime,
        endsAtTime: recurrence.rule.endsAtTime,
        timezone: recurrence.rule.timezone,
        seriesStartDateKey: recurrence.rule.seriesStartDateKey,
        endMode: recurrence.rule.endMode,
        endDateKey: recurrence.rule.endDateKey,
        occurrenceCountLimit: recurrence.rule.occurrenceCountLimit,
        websiteVisible: input.websiteVisible,
        infoboardVisible: input.infoboardVisible,
        homepageVisible: input.homepageVisible,
        wochenplanVisible: input.wochenplanVisible,
        trainingsplanVisible: input.trainingsplanVisible,
        teamPageVisible: input.teamPageVisible,
        clubEventOrganisationalScope: audienceScope,
      },
    });

    if (audienceScope === "SELECTED_ORG_UNITS") {
      if (audienceTeamIds.length > 0) {
        await tx.clubEventSeriesOrganisationalAudienceTeam.createMany({
          data: audienceTeamIds.map((teamId) => ({
            tenantId: input.tenantId,
            seriesId: series.id,
            teamId,
          })),
        });
      }
      if (audienceOrgUnitIds.length > 0) {
        await tx.clubEventSeriesOrganisationalAudienceOrgUnit.createMany({
          data: audienceOrgUnitIds.map((orgUnitId) => ({
            tenantId: input.tenantId,
            seriesId: series.id,
            orgUnitId,
          })),
        });
      }
    }

    const events = [];
    for (const occurrence of occurrences) {
      const event = await tx.event.create({
        data: buildEventCreateData(input, {
          startAt: occurrence.startAt,
          endAt: occurrence.endAt,
          allDay: occurrence.allDay,
          seriesId: series.id,
          occurrenceDateKey: occurrence.dateKey,
          scope: audienceScope,
        }),
      });

      if (audiencePrepared) {
        await persistClubEventOrganisationalAudienceInTransaction(
          tx,
          input.tenantId,
          event.id,
          audiencePrepared,
        );
      }

      events.push(event);
    }

    return { series, events };
  });

  for (const event of created.events) {
    for (const resourceId of facilityResourceIds) {
      await assignEventFacilityResource(input.tenantId, event.id, {
        facilityResourceId: resourceId,
      });
    }
  }

  return {
    eventIds: created.events.map((e) => e.id),
    seriesId: created.series.id,
    occurrenceCount: created.events.length,
  };
}

function buildEventCreateData(
  input: CreateClubEventRequest,
  occurrence: {
    startAt: Date;
    endAt: Date | null;
    allDay: boolean;
    seriesId: string | null;
    occurrenceDateKey: string | null;
    scope: "CLUB_WIDE" | "SELECTED_ORG_UNITS";
  },
): Prisma.EventCreateInput {
  return {
    season: { connect: { id: input.seasonId } },
    tenant: { connect: { id: input.tenantId } },
    type: "OTHER",
    source: input.source,
    status: input.status as Prisma.EventCreateInput["status"],
    reviewStage: input.reviewStage as Prisma.EventCreateInput["reviewStage"],
    reviewRequestedAt: input.reviewRequestedAt,
    reviewedAt: input.reviewedAt,
    createdByUserId: input.actorUserId,
    reviewedByUserId: input.reviewedByUserId,
    approvedByUserId: input.approvedByUserId,
    title: input.title,
    description: input.description,
    location: input.location,
    startAt: occurrence.startAt,
    endAt: occurrence.endAt,
    allDay: occurrence.allDay,
    organizerName: input.organizerName,
    remarks: input.remarks,
    websiteVisible: input.websiteVisible,
    infoboardVisible: input.infoboardVisible,
    homepageVisible: input.homepageVisible,
    wochenplanVisible: input.wochenplanVisible,
    trainingsplanVisible: input.trainingsplanVisible,
    teamPageVisible: input.teamPageVisible,
    sortOrder: input.sortOrder,
    clubEventOrganisationalScope: occurrence.scope,
    clubEventSeries: occurrence.seriesId
      ? { connect: { id: occurrence.seriesId } }
      : undefined,
    clubEventOccurrenceDateKey: occurrence.occurrenceDateKey,
  };
}

async function assignResourcesToFirstEvent(
  tenantId: string,
  eventId: string,
  facilityResourceIds: string[],
) {
  for (const resourceId of facilityResourceIds) {
    await assignEventFacilityResource(tenantId, eventId, {
      facilityResourceId: resourceId,
    });
  }
}
