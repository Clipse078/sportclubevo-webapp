import type { EventParticipationAudienceKind } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  resolveOrgUnitAudiencePersonIds,
  resolveRoleAudiencePersonIds,
  resolveTeamAudiencePersonIds,
} from "@/lib/requirements/requirement-audience-resolvers";
import { ClubEventNotFoundError } from "./club-events-service";

export type ClubEventAudienceEntryDto = {
  id: string;
  kind: EventParticipationAudienceKind;
  label: string;
  referenceId: string;
};

function formatPersonName(input: {
  firstName: string;
  lastName: string;
  displayName: string | null;
}): string {
  return input.displayName?.trim() || `${input.firstName} ${input.lastName}`.trim();
}

export async function listClubEventAudienceEntries(
  tenantId: string,
  eventId: string,
): Promise<ClubEventAudienceEntryDto[]> {
  const rows = await prisma.eventParticipationAudienceEntry.findMany({
    where: { tenantId, eventId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      kind: true,
      personId: true,
      teamId: true,
      orgUnitId: true,
      roleId: true,
      person: { select: { id: true, firstName: true, lastName: true, displayName: true } },
      team: { select: { id: true, name: true } },
      orgUnit: { select: { id: true, name: true } },
      role: { select: { id: true, name: true } },
    },
  });

  return rows.map((row) => {
    if (row.kind === "PERSON" && row.person) {
      return {
        id: row.id,
        kind: row.kind,
        referenceId: row.person.id,
        label: formatPersonName(row.person),
      };
    }
    if (row.kind === "TEAM" && row.team) {
      return { id: row.id, kind: row.kind, referenceId: row.team.id, label: row.team.name };
    }
    if (row.kind === "ORG_UNIT" && row.orgUnit) {
      return { id: row.id, kind: row.kind, referenceId: row.orgUnit.id, label: row.orgUnit.name };
    }
    if (row.kind === "ROLE" && row.role) {
      return { id: row.id, kind: row.kind, referenceId: row.role.id, label: row.role.name };
    }
    return { id: row.id, kind: row.kind, referenceId: "", label: "—" };
  });
}

export async function resolveClubEventInviteePersonIds(
  tenantId: string,
  eventId: string,
): Promise<string[]> {
  const entries = await prisma.eventParticipationAudienceEntry.findMany({
    where: { tenantId, eventId },
    select: {
      kind: true,
      personId: true,
      teamId: true,
      orgUnitId: true,
      roleId: true,
    },
  });

  const personIds: string[] = [];
  const teamIds: string[] = [];
  const orgUnitIds: string[] = [];
  const roleIds: string[] = [];

  for (const entry of entries) {
    if (entry.kind === "PERSON" && entry.personId) personIds.push(entry.personId);
    if (entry.kind === "TEAM" && entry.teamId) teamIds.push(entry.teamId);
    if (entry.kind === "ORG_UNIT" && entry.orgUnitId) orgUnitIds.push(entry.orgUnitId);
    if (entry.kind === "ROLE" && entry.roleId) roleIds.push(entry.roleId);
  }

  const [fromTeams, fromOrgUnits, fromRoles] = await Promise.all([
    resolveTeamAudiencePersonIds(tenantId, teamIds),
    resolveOrgUnitAudiencePersonIds(tenantId, orgUnitIds),
    resolveRoleAudiencePersonIds(tenantId, roleIds),
  ]);

  return [...new Set([...personIds, ...fromTeams, ...fromOrgUnits, ...fromRoles])];
}

export async function replaceClubEventAudiencePerson(
  tenantId: string,
  eventId: string,
  personId: string,
  actorUserId: string | null,
): Promise<void> {
  await assertClubEventWritable(tenantId, eventId);
  const person = await prisma.person.findFirst({
    where: { id: personId, tenantId, isActive: true },
    select: { id: true },
  });
  if (!person) throw new Error("INVALID_PERSON");

  await prisma.eventParticipationAudienceEntry.deleteMany({
    where: { tenantId, eventId, kind: "PERSON" },
  });
  await prisma.eventParticipationAudienceEntry.create({
    data: {
      tenantId,
      eventId,
      kind: "PERSON",
      personId,
      createdByUserId: actorUserId,
    },
  });
}

export async function addClubEventAudienceEntry(
  tenantId: string,
  eventId: string,
  input: {
    kind: EventParticipationAudienceKind;
    personId?: string | null;
    teamId?: string | null;
    orgUnitId?: string | null;
    roleId?: string | null;
  },
  actorUserId: string | null,
): Promise<void> {
  await assertClubEventWritable(tenantId, eventId);

  const data = {
    tenantId,
    eventId,
    kind: input.kind,
    personId: input.kind === "PERSON" ? input.personId ?? null : null,
    teamId: input.kind === "TEAM" ? input.teamId ?? null : null,
    orgUnitId: input.kind === "ORG_UNIT" ? input.orgUnitId ?? null : null,
    roleId: input.kind === "ROLE" ? input.roleId ?? null : null,
    createdByUserId: actorUserId,
  };

  if (input.kind === "PERSON" && !data.personId) throw new Error("INVALID_PERSON");
  if (input.kind === "TEAM" && !data.teamId) throw new Error("INVALID_TEAM");
  if (input.kind === "ORG_UNIT" && !data.orgUnitId) throw new Error("INVALID_ORG_UNIT");
  if (input.kind === "ROLE" && !data.roleId) throw new Error("INVALID_ROLE");

  await prisma.eventParticipationAudienceEntry.create({ data });
}

export async function removeClubEventAudienceEntry(
  tenantId: string,
  entryId: string,
): Promise<void> {
  const entry = await prisma.eventParticipationAudienceEntry.findFirst({
    where: { id: entryId, tenantId },
    select: { id: true },
  });
  if (!entry) throw new Error("ENTRY_NOT_FOUND");
  await prisma.eventParticipationAudienceEntry.delete({ where: { id: entryId } });
}

async function assertClubEventWritable(tenantId: string, eventId: string): Promise<void> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId, type: "OTHER" },
    select: { id: true, status: true },
  });
  if (!event) throw new ClubEventNotFoundError();
  if (event.status === "ARCHIVED") throw new Error("EVENT_ARCHIVED");
}
