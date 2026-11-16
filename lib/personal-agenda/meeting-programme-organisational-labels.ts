import { prisma } from "@/lib/db/prisma";

type MeetingVisibilityRow = {
  id: string;
  visibleTeamRefs: unknown;
  visibleOrgUnitRefs: unknown;
};

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function formatCompactUnitLabels(labels: readonly string[]): string | undefined {
  const unique = [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
  if (unique.length === 0) return undefined;
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} · ${unique[1]}`;
  return `${unique[0]} · +${unique.length - 1}`;
}

export async function loadMeetingOrganisationalLabelsById(
  tenantId: string,
  meetings: readonly MeetingVisibilityRow[],
): Promise<Map<string, string | undefined>> {
  const orgUnitIds = new Set<string>();
  const teamIds = new Set<string>();
  for (const meeting of meetings) {
    for (const id of parseStringArray(meeting.visibleOrgUnitRefs)) orgUnitIds.add(id);
    for (const id of parseStringArray(meeting.visibleTeamRefs)) teamIds.add(id);
  }

  const [orgUnits, teams] = await Promise.all([
    orgUnitIds.size
      ? prisma.orgUnit.findMany({
          where: { tenantId, id: { in: [...orgUnitIds] } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    teamIds.size
      ? prisma.team.findMany({
          where: { tenantId, id: { in: [...teamIds] } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const orgUnitNameById = new Map(orgUnits.map((row) => [row.id, row.name.trim()]));
  const teamNameById = new Map(teams.map((row) => [row.id, row.name.trim()]));

  const labels = new Map<string, string | undefined>();
  for (const meeting of meetings) {
    const orgNames = parseStringArray(meeting.visibleOrgUnitRefs)
      .map((id) => orgUnitNameById.get(id))
      .filter((name): name is string => Boolean(name?.trim()));
    const teamNames = parseStringArray(meeting.visibleTeamRefs)
      .map((id) => teamNameById.get(id))
      .filter((name): name is string => Boolean(name?.trim()));

    const orgLabel = formatCompactUnitLabels(orgNames);
    const teamLabel = formatCompactUnitLabels(teamNames);
    labels.set(meeting.id, orgLabel ?? teamLabel ?? undefined);
  }

  return labels;
}