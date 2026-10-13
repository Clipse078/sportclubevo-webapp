import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ClubEventValidationError } from "@/lib/events/club-events-service";
import { buildSceClubEventAudiencePresentation } from "@/lib/events/club-event-organisational-audience-presentation";
import type {
  ClubEventOrganisationalAudienceDto,
  ClubEventOrganisationalAudienceInput,
  ClubEventOrganisationalAudienceTargetDto,
  ClubEventOrganisationalAudienceTargetKind,
  ClubEventOrganisationalAudienceTargetRef,
  ClubEventOrganisationalScope,
} from "@/lib/events/club-event-organisational-audience-types";
import type { SceClubEventAudiencePresentation } from "@/lib/sporting-activity-presentation/canonical/types";

function dedupeRefs(
  refs: readonly ClubEventOrganisationalAudienceTargetRef[],
): ClubEventOrganisationalAudienceTargetRef[] {
  const seen = new Set<string>();
  const out: ClubEventOrganisationalAudienceTargetRef[] = [];
  for (const ref of refs) {
    const key = `${ref.kind}:${ref.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}

export function normalizeClubEventOrganisationalAudienceInput(
  input: ClubEventOrganisationalAudienceInput,
): { scope: ClubEventOrganisationalScope; refs: ClubEventOrganisationalAudienceTargetRef[] } {
  const scope = input.scope;
  if (scope !== "CLUB_WIDE" && scope !== "SELECTED_ORG_UNITS") {
    throw new ClubEventValidationError("Ungültiger Gültigkeitsbereich.", "audience.scope");
  }

  if (scope === "CLUB_WIDE") {
    return { scope, refs: [] };
  }

  const refs: ClubEventOrganisationalAudienceTargetRef[] = [];
  if (input.targets?.length) {
    for (const target of input.targets) {
      if (target.kind !== "TEAM" && target.kind !== "ORG_UNIT") {
        throw new ClubEventValidationError("Ungültiges Ziel.", "audience.targets");
      }
      if (!target.id?.trim()) {
        throw new ClubEventValidationError("Ziel-ID ist erforderlich.", "audience.targets");
      }
      refs.push({ kind: target.kind, id: target.id.trim() });
    }
  } else {
    for (const teamId of input.teamIds ?? []) {
      if (teamId?.trim()) refs.push({ kind: "TEAM", id: teamId.trim() });
    }
    for (const orgUnitId of input.orgUnitIds ?? []) {
      if (orgUnitId?.trim()) refs.push({ kind: "ORG_UNIT", id: orgUnitId.trim() });
    }
  }

  const unique = dedupeRefs(refs);
  if (unique.length === 0) {
    throw new ClubEventValidationError(
      "Mindestens eine Organisationseinheit oder ein Team ist erforderlich.",
      "audience.targets",
    );
  }

  return { scope, refs: unique };
}

async function resolveTargetLabels(
  tenantId: string,
  refs: readonly ClubEventOrganisationalAudienceTargetRef[],
): Promise<ClubEventOrganisationalAudienceTargetDto[]> {
  const teamIds = refs.filter((r) => r.kind === "TEAM").map((r) => r.id);
  const orgUnitIds = refs.filter((r) => r.kind === "ORG_UNIT").map((r) => r.id);

  const [teams, orgUnits] = await Promise.all([
    teamIds.length
      ? prisma.team.findMany({
          where: { id: { in: teamIds } },
          select: {
            id: true,
            tenantId: true,
            isActive: true,
            name: true,
            alternativeName: true,
          },
        })
      : Promise.resolve([]),
    orgUnitIds.length
      ? prisma.orgUnit.findMany({
          where: { id: { in: orgUnitIds } },
          select: {
            id: true,
            tenantId: true,
            name: true,
            status: true,
            archivedAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const orgById = new Map(orgUnits.map((o) => [o.id, o]));

  const out: ClubEventOrganisationalAudienceTargetDto[] = [];
  for (const ref of refs) {
    if (ref.kind === "TEAM") {
      const team = teamById.get(ref.id);
      if (!team || team.tenantId !== tenantId) {
        throw new ClubEventValidationError("Team nicht gefunden.", "audience.targets");
      }
      if (!team.isActive) {
        throw new ClubEventValidationError("Team ist nicht aktiv.", "audience.targets");
      }
      const label = team.alternativeName?.trim() || team.name.trim();
      out.push({ kind: "TEAM", id: ref.id, label });
      continue;
    }

    const orgUnit = orgById.get(ref.id);
    if (!orgUnit || orgUnit.tenantId !== tenantId) {
      throw new ClubEventValidationError("Organisationseinheit nicht gefunden.", "audience.targets");
    }
    if (orgUnit.archivedAt != null || orgUnit.status !== "ACTIVE") {
      throw new ClubEventValidationError(
        "Organisationseinheit ist nicht aktiv.",
        "audience.targets",
      );
    }
    out.push({ kind: "ORG_UNIT", id: ref.id, label: orgUnit.name.trim() });
  }

  return out;
}

export async function getClubEventOrganisationalAudienceDto(
  tenantId: string,
  eventId: string,
): Promise<ClubEventOrganisationalAudienceDto> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId, type: "OTHER" },
    select: {
      clubEventOrganisationalScope: true,
      clubEventOrganisationalAudienceTeams: {
        select: { teamId: true, team: { select: { alternativeName: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      clubEventOrganisationalAudienceOrgUnits: {
        select: { orgUnitId: true, orgUnit: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!event) {
    throw new ClubEventValidationError("Veranstaltung nicht gefunden.");
  }

  const scope = event.clubEventOrganisationalScope as ClubEventOrganisationalScope;
  const targets: ClubEventOrganisationalAudienceTargetDto[] = [];

  for (const row of event.clubEventOrganisationalAudienceTeams) {
    targets.push({
      kind: "TEAM",
      id: row.teamId,
      label: row.team.alternativeName?.trim() || row.team.name.trim(),
    });
  }
  for (const row of event.clubEventOrganisationalAudienceOrgUnits) {
    targets.push({
      kind: "ORG_UNIT",
      id: row.orgUnitId,
      label: row.orgUnit.name.trim(),
    });
  }

  return {
    scope,
    teamIds: event.clubEventOrganisationalAudienceTeams.map((r) => r.teamId),
    orgUnitIds: event.clubEventOrganisationalAudienceOrgUnits.map((r) => r.orgUnitId),
    targets,
  };
}

export async function resolveClubEventOrganisationalAudiencePresentation(
  tenantId: string,
  eventId: string,
): Promise<SceClubEventAudiencePresentation | undefined> {
  const dto = await getClubEventOrganisationalAudienceDto(tenantId, eventId);
  if (dto.scope === "CLUB_WIDE" && dto.targets.length === 0) {
    return buildSceClubEventAudiencePresentation({ scope: "CLUB_WIDE", targets: [] });
  }
  if (dto.scope === "SELECTED_ORG_UNITS" && dto.targets.length === 0) {
    return undefined;
  }
  return buildSceClubEventAudiencePresentation({ scope: dto.scope, targets: dto.targets });
}

async function persistClubEventOrganisationalAudience(
  tx: Prisma.TransactionClient,
  tenantId: string,
  eventId: string,
  normalized: { scope: ClubEventOrganisationalScope; refs: ClubEventOrganisationalAudienceTargetRef[] },
  labeledTargets: ClubEventOrganisationalAudienceTargetDto[],
): Promise<void> {
  const teamIds = labeledTargets.filter((t) => t.kind === "TEAM").map((t) => t.id);
  const orgUnitIds = labeledTargets.filter((t) => t.kind === "ORG_UNIT").map((t) => t.id);

  await tx.event.update({
    where: { id: eventId },
    data: { clubEventOrganisationalScope: normalized.scope },
  });

  await tx.clubEventOrganisationalAudienceTeam.deleteMany({ where: { eventId, tenantId } });
  await tx.clubEventOrganisationalAudienceOrgUnit.deleteMany({ where: { eventId, tenantId } });

  if (normalized.scope === "SELECTED_ORG_UNITS") {
    if (teamIds.length > 0) {
      await tx.clubEventOrganisationalAudienceTeam.createMany({
        data: teamIds.map((teamId) => ({ tenantId, eventId, teamId })),
      });
    }
    if (orgUnitIds.length > 0) {
      await tx.clubEventOrganisationalAudienceOrgUnit.createMany({
        data: orgUnitIds.map((orgUnitId) => ({ tenantId, eventId, orgUnitId })),
      });
    }
  }
}

export async function prepareClubEventOrganisationalAudienceWrite(
  tenantId: string,
  input: ClubEventOrganisationalAudienceInput,
): Promise<{
  normalized: { scope: ClubEventOrganisationalScope; refs: ClubEventOrganisationalAudienceTargetRef[] };
  labeledTargets: ClubEventOrganisationalAudienceTargetDto[];
}> {
  const normalized = normalizeClubEventOrganisationalAudienceInput(input);
  const labeledTargets =
    normalized.scope === "CLUB_WIDE"
      ? []
      : await resolveTargetLabels(tenantId, normalized.refs);
  return { normalized, labeledTargets };
}

export async function replaceClubEventOrganisationalAudience(
  tenantId: string,
  eventId: string,
  input: ClubEventOrganisationalAudienceInput,
): Promise<ClubEventOrganisationalAudienceDto> {
  const existing = await prisma.event.findFirst({
    where: { id: eventId, tenantId, type: "OTHER" },
    select: { id: true },
  });
  if (!existing) {
    throw new ClubEventValidationError("Veranstaltung nicht gefunden.");
  }

  const { normalized, labeledTargets } = await prepareClubEventOrganisationalAudienceWrite(
    tenantId,
    input,
  );

  await prisma.$transaction(async (tx) => {
    await persistClubEventOrganisationalAudience(
      tx,
      tenantId,
      eventId,
      normalized,
      labeledTargets,
    );
  });

  return getClubEventOrganisationalAudienceDto(tenantId, eventId);
}

export async function persistClubEventOrganisationalAudienceInTransaction(
  tx: Prisma.TransactionClient,
  tenantId: string,
  eventId: string,
  prepared: Awaited<ReturnType<typeof prepareClubEventOrganisationalAudienceWrite>>,
): Promise<void> {
  await persistClubEventOrganisationalAudience(
    tx,
    tenantId,
    eventId,
    prepared.normalized,
    prepared.labeledTargets,
  );
}

export function clubEventOrganisationalTargetKindFromSelectorType(
  type: string,
): ClubEventOrganisationalAudienceTargetKind | null {
  if (type === "TEAM") return "TEAM";
  if (type === "ORG_UNIT") return "ORG_UNIT";
  return null;
}
