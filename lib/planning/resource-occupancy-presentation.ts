/**
 * PLANNING-UX-07R3 — shared resource occupancy presentation contract.
 *
 * Canonical allocation/availability data (lib/facilities/availability-service.ts)
 * is merged with in-context allocations (e.g. tournament participant dressing
 * rooms excluded by excludeEventId) and normalized for UI surfaces.
 */

import type { ResourceAvailabilityAnnotation } from "@/components/admin/training/FacilityResourceSelector";

export type ResourceOccupancyPresentationKind = "FREE" | "OCCUPIED" | "SHARED" | "CURRENT";

export type TournamentParticipantDressingOccupancySource = {
  id: string;
  displayName: string;
  dressingRoomAllocations: Array<{ facilityResourceId: string }>;
};

export type ResourceOccupancyDisplayContext = {
  isSelected?: boolean;
};

function uniqueLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of labels) {
    const trimmed = label.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function joinOwnerLabels(labels: string[]): string {
  return uniqueLabels(labels).join(" · ");
}

function mergeConflictAnnotations(
  base: ResourceAvailabilityAnnotation | undefined,
  ownerLabels: string[],
): ResourceAvailabilityAnnotation {
  const internalLabel = joinOwnerLabels(ownerLabels);
  if (!base || base.status === "FREE") {
    return {
      status: "OCCUPIED",
      conflictLabel: internalLabel,
      occupancyPresentation: "OCCUPIED",
      conflicts: ownerLabels.map((label) => ({ label, startAt: "", endAt: "" })),
    };
  }

  const externalLabels =
    base.conflicts?.map((c) => c.label).filter(Boolean) ??
    (base.conflictLabel ? [base.conflictLabel] : []);
  const combined = uniqueLabels([...externalLabels, ...ownerLabels]);

  return {
    ...base,
    status: "OCCUPIED",
    conflictLabel: joinOwnerLabels(combined),
    occupancyPresentation: base.occupancyPresentation === "SHARED" ? "SHARED" : "OCCUPIED",
    conflicts: [
      ...(base.conflicts ?? []),
      ...ownerLabels.map((label) => ({ label, startAt: "", endAt: "" })),
    ],
  };
}

/**
 * Merges tournament participant dressing-room allocations into the base
 * availability map for one viewing participant. Same tournament/time window
 * is implicit — participant allocations always overlap the current event.
 */
export function mergeTournamentParticipantDressingRoomAvailability(
  baseAvailability: Map<string, ResourceAvailabilityAnnotation> | undefined,
  participants: TournamentParticipantDressingOccupancySource[],
  viewingParticipantId: string,
): Map<string, ResourceAvailabilityAnnotation> {
  const result = new Map(baseAvailability ?? []);

  const ownersByResource = new Map<string, Array<{ participantId: string; displayName: string }>>();
  for (const participant of participants) {
    for (const allocation of participant.dressingRoomAllocations) {
      const list = ownersByResource.get(allocation.facilityResourceId) ?? [];
      list.push({ participantId: participant.id, displayName: participant.displayName });
      ownersByResource.set(allocation.facilityResourceId, list);
    }
  }

  const viewingParticipant = participants.find((p) => p.id === viewingParticipantId);
  const resourceIds = new Set<string>([...result.keys(), ...ownersByResource.keys()]);

  for (const resourceId of resourceIds) {
    const owners = ownersByResource.get(resourceId) ?? [];
    if (owners.length === 0) continue;

    const selfSelected = owners.some((o) => o.participantId === viewingParticipantId);
    const otherOwners = owners.filter((o) => o.participantId !== viewingParticipantId);
    const base = result.get(resourceId);

    if (otherOwners.length === 0 && selfSelected) {
      result.set(resourceId, {
        ...(base ?? { status: "FREE" }),
        status: "OCCUPIED",
        conflictLabel: viewingParticipant?.displayName ?? owners[0]!.displayName,
        occupancyPresentation: "CURRENT",
      });
      continue;
    }

    if (selfSelected && otherOwners.length > 0) {
      const sharingLabels = otherOwners.map((o) => o.displayName);
      result.set(resourceId, {
        ...mergeConflictAnnotations(base, owners.map((o) => o.displayName)),
        occupancyPresentation: "SHARED",
        sharingSubjectLabels: sharingLabels,
        conflictLabel: joinOwnerLabels(owners.map((o) => o.displayName)),
      });
      continue;
    }

    if (otherOwners.length > 0) {
      result.set(
        resourceId,
        mergeConflictAnnotations(
          base,
          otherOwners.map((o) => o.displayName),
        ),
      );
    }
  }

  return result;
}

export function buildTournamentParticipantDressingRoomAvailabilityByParticipant(
  baseAvailability: Map<string, ResourceAvailabilityAnnotation> | undefined,
  participants: TournamentParticipantDressingOccupancySource[],
): Map<string, Map<string, ResourceAvailabilityAnnotation>> {
  const byParticipant = new Map<string, Map<string, ResourceAvailabilityAnnotation>>();
  for (const participant of participants) {
    byParticipant.set(
      participant.id,
      mergeTournamentParticipantDressingRoomAvailability(baseAvailability, participants, participant.id),
    );
  }
  return byParticipant;
}

export function resolveResourceOccupancyPresentationKind(
  annotation: ResourceAvailabilityAnnotation | undefined,
  context: ResourceOccupancyDisplayContext = {},
): ResourceOccupancyPresentationKind {
  if (!annotation || annotation.status === "FREE") return "FREE";
  if (annotation.occupancyPresentation === "SHARED" && context.isSelected) return "SHARED";
  if (annotation.occupancyPresentation === "CURRENT" && context.isSelected) return "CURRENT";
  if (annotation.occupancyPresentation === "CURRENT") return "CURRENT";
  if (annotation.occupancyPresentation === "SHARED") return "SHARED";
  return "OCCUPIED";
}

/**
 * Primary occupancy line for resource cards and native selects.
 * Owner labels replace generic "Belegt" when canonical data provides them.
 */
export function formatResourceOccupancyPrimaryLine(
  annotation: ResourceAvailabilityAnnotation | undefined,
  context: ResourceOccupancyDisplayContext = {},
): string | null {
  if (!annotation) return "Frei";

  const kind = resolveResourceOccupancyPresentationKind(annotation, context);

  if (kind === "FREE") return "Frei";

  if (kind === "SHARED" && context.isSelected) {
    const others = annotation.sharingSubjectLabels ?? [];
    if (others.length > 0) {
      return `Geteilt mit ${joinOwnerLabels(others)}`;
    }
  }

  if (annotation.conflictLabel?.trim()) {
    return annotation.conflictLabel.trim();
  }

  return "Belegt";
}

export function isResourceOccupancyInformational(
  annotation: ResourceAvailabilityAnnotation | undefined,
): boolean {
  return !!annotation && annotation.status === "OCCUPIED";
}
