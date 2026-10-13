import { getResourceAvailability } from "@/lib/facilities/availability-service";
import type { GeneratedClubEventOccurrence } from "@/lib/events/club-event-recurrence-types";
import { classifyFacilityResourceType } from "@/lib/training/allocation-groups";

export type ClubEventSeriesResourceConflict = {
  dateKey: string;
  resourceId: string;
  resourceName: string;
  conflictLabel: string | null;
};

export type ClubEventSeriesResourceValidationResult = {
  totalOccurrences: number;
  conflictingOccurrences: ClubEventSeriesResourceConflict[];
};

export async function validateClubEventSeriesResourceAssignments(input: {
  tenantId: string;
  occurrences: GeneratedClubEventOccurrence[];
  facilityResourceIds: string[];
}): Promise<ClubEventSeriesResourceValidationResult> {
  if (input.facilityResourceIds.length === 0 || input.occurrences.length === 0) {
    return { totalOccurrences: input.occurrences.length, conflictingOccurrences: [] };
  }

  const conflicts: ClubEventSeriesResourceConflict[] = [];

  for (const occurrence of input.occurrences) {
    const endAt = occurrence.endAt ?? occurrence.startAt;
    for (const resourceId of input.facilityResourceIds) {
      const group = await resolveAvailabilityGroupForResource(input.tenantId, resourceId);
      if (!group) continue;

      const availability = await getResourceAvailability({
        tenantId: input.tenantId,
        group,
        startAt: occurrence.startAt.toISOString(),
        endAt: endAt.toISOString(),
      });

      const row = availability.find((entry) => entry.resourceId === resourceId);
      if (row?.status === "OCCUPIED") {
        conflicts.push({
          dateKey: occurrence.dateKey,
          resourceId,
          resourceName: row.resourceName,
          conflictLabel: row.conflictLabel,
        });
      }
    }
  }

  return {
    totalOccurrences: input.occurrences.length,
    conflictingOccurrences: conflicts,
  };
}

async function resolveAvailabilityGroupForResource(
  tenantId: string,
  facilityResourceId: string,
): Promise<"PITCH_HALL" | "DRESSING_ROOM" | "OTHER" | null> {
  const { prisma } = await import("@/lib/db/prisma");
  const resource = await prisma.facilityResource.findFirst({
    where: { id: facilityResourceId, facility: { tenantId } },
    select: { type: true },
  });
  if (!resource) return null;
  return classifyFacilityResourceType(resource.type);
}

export function formatClubEventSeriesResourceConflictMessage(
  result: ClubEventSeriesResourceValidationResult,
): string {
  const conflictDates = [...new Set(result.conflictingOccurrences.map((c) => c.dateKey))];
  const total = result.totalOccurrences;
  const conflictCount = conflictDates.length;
  if (conflictCount === 0) return "";

  const first = result.conflictingOccurrences[0];
  const [y, m, d] = first.dateKey.split("-");
  const dateLabel = `${d}.${m}.${y}`;
  return `${conflictCount} von ${total} Terminen hat einen Ressourcenkonflikt. ${dateLabel} — ${first.resourceName}${first.conflictLabel ? ` (${first.conflictLabel})` : ""}`;
}
