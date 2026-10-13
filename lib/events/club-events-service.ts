/**
 * CLUB-EVENTS-01: Service layer for tenant-managed Veranstaltungen (EventType.OTHER).
 *
 * All queries are tenant-scoped via tenantId from the session —
 * never from URL params or request body. Matches/Tournaments/Trainings
 * are excluded from all operations here.
 */

import { notifyPersonalDashboardForClubEventAudience } from "@/lib/dashboard/read-model/invalidate-audience";
import {
  getClubEventOrganisationalAudienceDto,
  persistClubEventOrganisationalAudienceInTransaction,
  prepareClubEventOrganisationalAudienceWrite,
  replaceClubEventOrganisationalAudience,
} from "@/lib/events/club-event-organisational-audience-service";
import type {
  ClubEventOrganisationalAudienceDto,
  ClubEventOrganisationalAudienceInput,
} from "@/lib/events/club-event-organisational-audience-types";
import { prisma } from "@/lib/db/prisma";

export class ClubEventNotFoundError extends Error {
  constructor() {
    super("Veranstaltung nicht gefunden.");
    this.name = "ClubEventNotFoundError";
  }
}

export class ClubEventValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ClubEventValidationError";
  }
}

export type ClubEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
  organizerName: string | null;
  remarks: string | null;
  status: string;
  reviewStage: string;
  source: string;
  websiteVisible: boolean;
  infoboardVisible: boolean;
  homepageVisible: boolean;
  wochenplanVisible: boolean;
  trainingsplanVisible: boolean;
  teamPageVisible: boolean;
  tenantId: string | null;
  seasonId: string | null;
  teamId: string | null;
  createdAt: Date;
  updatedAt: Date;
  season: {
    id: string;
    key: string;
    name: string;
  } | null;
  clubEventOrganisationalScope: "CLUB_WIDE" | "SELECTED_ORG_UNITS";
  organisationalAudience: ClubEventOrganisationalAudienceDto;
};

const CLUB_EVENT_SELECT = {
  id: true,
  title: true,
  description: true,
  location: true,
  startAt: true,
  endAt: true,
  allDay: true,
  organizerName: true,
  remarks: true,
  status: true,
  reviewStage: true,
  source: true,
  websiteVisible: true,
  infoboardVisible: true,
  homepageVisible: true,
  wochenplanVisible: true,
  trainingsplanVisible: true,
  teamPageVisible: true,
  tenantId: true,
  seasonId: true,
  teamId: true,
  createdAt: true,
  updatedAt: true,
  season: {
    select: {
      id: true,
      key: true,
      name: true,
    },
  },
  clubEventOrganisationalScope: true,
  clubEventOrganisationalAudienceTeams: {
    select: {
      teamId: true,
      team: { select: { name: true, alternativeName: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  clubEventOrganisationalAudienceOrgUnits: {
    select: {
      orgUnitId: true,
      orgUnit: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

type ClubEventRow = Awaited<
  ReturnType<typeof prisma.event.findFirst<{ select: typeof CLUB_EVENT_SELECT }>>
>;

function mapClubEventRow(row: NonNullable<ClubEventRow>): ClubEvent {
  const targets = [
    ...row.clubEventOrganisationalAudienceTeams.map((entry) => ({
      kind: "TEAM" as const,
      id: entry.teamId,
      label: entry.team.alternativeName?.trim() || entry.team.name.trim(),
    })),
    ...row.clubEventOrganisationalAudienceOrgUnits.map((entry) => ({
      kind: "ORG_UNIT" as const,
      id: entry.orgUnitId,
      label: entry.orgUnit.name.trim(),
    })),
  ];

  const scope = row.clubEventOrganisationalScope as ClubEvent["clubEventOrganisationalScope"];

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startAt: row.startAt,
    endAt: row.endAt,
    allDay: row.allDay,
    organizerName: row.organizerName,
    remarks: row.remarks,
    status: row.status,
    reviewStage: row.reviewStage,
    source: row.source,
    websiteVisible: row.websiteVisible,
    infoboardVisible: row.infoboardVisible,
    homepageVisible: row.homepageVisible,
    wochenplanVisible: row.wochenplanVisible,
    trainingsplanVisible: row.trainingsplanVisible,
    teamPageVisible: row.teamPageVisible,
    tenantId: row.tenantId,
    seasonId: row.seasonId,
    teamId: row.teamId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    season: row.season,
    clubEventOrganisationalScope: scope,
    organisationalAudience: {
      scope,
      teamIds: row.clubEventOrganisationalAudienceTeams.map((t) => t.teamId),
      orgUnitIds: row.clubEventOrganisationalAudienceOrgUnits.map((o) => o.orgUnitId),
      targets,
    },
  };
}

/**
 * List all type=OTHER events for the given tenant, ordered by startAt asc.
 */
export async function listClubEvents(tenantId: string): Promise<ClubEvent[]> {
  const rows = await prisma.event.findMany({
    where: {
      type: "OTHER",
      tenantId,
    },
    orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
    select: CLUB_EVENT_SELECT,
  });
  return rows.map(mapClubEventRow);
}

/**
 * Get a single type=OTHER event for the given tenant, or null if not found.
 * Enforces tenant isolation.
 */
export async function getClubEvent(
  tenantId: string,
  eventId: string,
): Promise<ClubEvent | null> {
  const row = await prisma.event.findFirst({
    where: {
      id: eventId,
      type: "OTHER",
      tenantId,
    },
    select: CLUB_EVENT_SELECT,
  });
  return row ? mapClubEventRow(row) : null;
}

export type UpdateClubEventInput = {
  title?: string;
  description?: string | null;
  location?: string | null;
  startAt?: Date;
  endAt?: Date | null;
  allDay?: boolean;
  organizerName?: string | null;
  remarks?: string | null;
  websiteVisible?: boolean;
  infoboardVisible?: boolean;
  homepageVisible?: boolean;
  wochenplanVisible?: boolean;
  trainingsplanVisible?: boolean;
  teamPageVisible?: boolean;
  audience?: ClubEventOrganisationalAudienceInput;
};

/**
 * Update a type=OTHER event for the given tenant.
 * Throws ClubEventNotFoundError when the event does not exist or belongs to a different tenant.
 * Throws ClubEventValidationError for invalid field values.
 */
export async function updateClubEvent(
  tenantId: string,
  eventId: string,
  input: UpdateClubEventInput,
): Promise<ClubEvent> {
  const existing = await prisma.event.findFirst({
    where: { id: eventId, type: "OTHER", tenantId },
    select: { id: true, status: true, source: true },
  });

  if (!existing) {
    throw new ClubEventNotFoundError();
  }

  if (existing.status === "ARCHIVED") {
    throw new ClubEventValidationError(
      "Archivierte Veranstaltungen können nicht bearbeitet werden.",
    );
  }

  if (input.title !== undefined && !String(input.title ?? "").trim()) {
    throw new ClubEventValidationError("Titel ist erforderlich.", "title");
  }

  if (input.startAt !== undefined && Number.isNaN(input.startAt.getTime())) {
    throw new ClubEventValidationError(
      "Startdatum ist ungültig.",
      "startAt",
    );
  }

  if (
    input.endAt !== undefined &&
    input.endAt !== null &&
    Number.isNaN(input.endAt.getTime())
  ) {
    throw new ClubEventValidationError("Enddatum ist ungültig.", "endAt");
  }

  const data: Record<string, unknown> = {};

  if (input.title !== undefined) data.title = String(input.title).trim();
  if (input.description !== undefined)
    data.description =
      input.description === null
        ? null
        : String(input.description).trim() || null;
  if (input.location !== undefined)
    data.location =
      input.location === null ? null : String(input.location).trim() || null;
  if (input.startAt !== undefined) data.startAt = input.startAt;
  if (input.endAt !== undefined) data.endAt = input.endAt;
  if (input.allDay !== undefined) data.allDay = Boolean(input.allDay);
  if (input.organizerName !== undefined)
    data.organizerName =
      input.organizerName === null
        ? null
        : String(input.organizerName).trim() || null;
  if (input.remarks !== undefined)
    data.remarks =
      input.remarks === null ? null : String(input.remarks).trim() || null;
  if (input.websiteVisible !== undefined)
    data.websiteVisible = Boolean(input.websiteVisible);
  if (input.infoboardVisible !== undefined)
    data.infoboardVisible = Boolean(input.infoboardVisible);
  if (input.homepageVisible !== undefined)
    data.homepageVisible = Boolean(input.homepageVisible);
  if (input.wochenplanVisible !== undefined)
    data.wochenplanVisible = Boolean(input.wochenplanVisible);
  if (input.trainingsplanVisible !== undefined)
    data.trainingsplanVisible = Boolean(input.trainingsplanVisible);
  if (input.teamPageVisible !== undefined)
    data.teamPageVisible = Boolean(input.teamPageVisible);

  const audiencePrepared =
    input.audience !== undefined
      ? await prepareClubEventOrganisationalAudienceWrite(tenantId, input.audience)
      : null;

  const updated = await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.event.update({
        where: { id: eventId, tenantId, type: "OTHER" },
        data,
      });
    }
    if (audiencePrepared) {
      await persistClubEventOrganisationalAudienceInTransaction(
        tx,
        tenantId,
        eventId,
        audiencePrepared,
      );
    }
    return tx.event.findFirst({
      where: { id: eventId, tenantId, type: "OTHER" },
      select: CLUB_EVENT_SELECT,
    });
  });

  if (!updated) {
    throw new ClubEventNotFoundError();
  }

  void notifyPersonalDashboardForClubEventAudience(tenantId, eventId);
  return mapClubEventRow(updated);
}

export async function applyClubEventOrganisationalAudienceOnCreate(
  tenantId: string,
  eventId: string,
  audience: ClubEventOrganisationalAudienceInput | undefined,
): Promise<void> {
  if (!audience) return;
  await replaceClubEventOrganisationalAudience(tenantId, eventId, audience);
}

export { getClubEventOrganisationalAudienceDto };

/**
 * Archive (soft-delete) a type=OTHER event: sets status=ARCHIVED.
 * Throws ClubEventNotFoundError when the event does not exist or belongs to a different tenant.
 */
export async function archiveClubEvent(
  tenantId: string,
  eventId: string,
): Promise<ClubEvent> {
  const existing = await prisma.event.findFirst({
    where: { id: eventId, type: "OTHER", tenantId },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new ClubEventNotFoundError();
  }

  const archived = await prisma.event.update({
    where: { id: eventId, tenantId, type: "OTHER" },
    data: { status: "ARCHIVED" },
    select: CLUB_EVENT_SELECT,
  });
  void notifyPersonalDashboardForClubEventAudience(tenantId, eventId);
  return mapClubEventRow(archived);
}

/**
 * Restore an archived type=OTHER event: sets status=SCHEDULED.
 * Throws ClubEventNotFoundError when the event does not exist or belongs to a different tenant.
 */
export async function restoreClubEvent(
  tenantId: string,
  eventId: string,
): Promise<ClubEvent> {
  const existing = await prisma.event.findFirst({
    where: { id: eventId, type: "OTHER", tenantId },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new ClubEventNotFoundError();
  }

  const restored = await prisma.event.update({
    where: { id: eventId, tenantId, type: "OTHER" },
    data: { status: "SCHEDULED" },
    select: CLUB_EVENT_SELECT,
  });
  void notifyPersonalDashboardForClubEventAudience(tenantId, eventId);
  return mapClubEventRow(restored);
}

/**
 * Permanently delete a type=OTHER event for the given tenant.
 * Throws ClubEventNotFoundError when the event does not exist or belongs to a different tenant.
 */
export async function deleteClubEvent(
  tenantId: string,
  eventId: string,
): Promise<void> {
  const existing = await prisma.event.findFirst({
    where: { id: eventId, type: "OTHER", tenantId },
    select: { id: true },
  });

  if (!existing) {
    throw new ClubEventNotFoundError();
  }

  await prisma.event.delete({
    where: { id: eventId, tenantId, type: "OTHER" },
  });
}
