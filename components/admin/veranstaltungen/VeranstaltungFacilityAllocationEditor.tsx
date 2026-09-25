"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { classifyFacilityResourceType } from "@/lib/training/allocation-groups";
import type { EventFacilityAllocationDto } from "@/lib/events/event-facility-allocation-types";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { ResourceAvailabilityAnnotation } from "@/components/admin/training/FacilityResourceSelector";
import { PlanningSingleResourceAssignment } from "@/components/admin/shared/planning/PlanningSingleResourceAssignment";

type Props = {
  eventId: string;
  canManage: boolean;
  initialAllocations: EventFacilityAllocationDto[];
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  pitchAvailabilityByResourceId?: Map<string, ResourceAvailabilityAnnotation>;
  dressingRoomAvailabilityByResourceId?: Map<string, ResourceAvailabilityAnnotation>;
};

function allocationsForGroup(
  allocations: EventFacilityAllocationDto[],
  group: "PITCH_HALL" | "DRESSING_ROOM",
): EventFacilityAllocationDto[] {
  return allocations.filter(
    (a) => classifyFacilityResourceType(a.facilityResourceType as never) === group,
  );
}

export default function VeranstaltungFacilityAllocationEditor({
  eventId,
  canManage,
  initialAllocations,
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
  pitchAvailabilityByResourceId,
  dressingRoomAvailabilityByResourceId,
}: Props) {
  const [allocations, setAllocations] = useState(initialAllocations);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pitchAllocations = useMemo(
    () => allocationsForGroup(allocations, "PITCH_HALL"),
    [allocations],
  );
  const dressingAllocations = useMemo(
    () => allocationsForGroup(allocations, "DRESSING_ROOM"),
    [allocations],
  );

  const pitchSelectedIds = useMemo(
    () => new Set(pitchAllocations.map((a) => a.facilityResourceId)),
    [pitchAllocations],
  );
  const dressingSelectedIds = useMemo(
    () => new Set(dressingAllocations.map((a) => a.facilityResourceId)),
    [dressingAllocations],
  );

  const assignOrReplace = useCallback(
    async (group: "PITCH_HALL" | "DRESSING_ROOM", facilityResourceId: string) => {
      const existing = allocationsForGroup(allocations, group)[0];
      if (existing?.facilityResourceId === facilityResourceId) return;

      if (existing) {
        const res = await fetch(
          `/api/events/${eventId}/facility-allocations/${existing.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ facilityResourceId }),
          },
        );
        const data = (await res.json().catch(() => null)) as
          | { allocation?: EventFacilityAllocationDto; error?: string }
          | null;
        if (!res.ok || !data?.allocation) {
          throw new Error(data?.error ?? "Ressource konnte nicht geändert werden.");
        }
        setAllocations((prev) =>
          prev.map((row) => (row.id === existing.id ? data.allocation! : row)),
        );
        return;
      }

      const res = await fetch(`/api/events/${eventId}/facility-allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityResourceId }),
      });
      const data = (await res.json().catch(() => null)) as
        | { allocation?: EventFacilityAllocationDto; error?: string }
        | null;
      if (!res.ok || !data?.allocation) {
        throw new Error(data?.error ?? "Ressource konnte nicht zugewiesen werden.");
      }
      setAllocations((prev) => [...prev, data.allocation!]);
    },
    [allocations, eventId],
  );

  const unassign = useCallback(
    async (allocationId: string) => {
      const res = await fetch(`/api/events/${eventId}/facility-allocations/${allocationId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Ressource konnte nicht entfernt werden.");
      }
      setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
    },
    [eventId],
  );

  const handlePitchSelect = useCallback(
    (facilityResourceId: string) => {
      setError(null);
      startTransition(async () => {
        try {
          await assignOrReplace("PITCH_HALL", facilityResourceId);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Zuweisung fehlgeschlagen.");
        }
      });
    },
    [assignOrReplace],
  );

  const handlePitchDeselect = useCallback(
    (facilityResourceId: string) => {
      const row = pitchAllocations.find((a) => a.facilityResourceId === facilityResourceId);
      if (!row) return;
      setError(null);
      startTransition(async () => {
        try {
          await unassign(row.id);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Entfernen fehlgeschlagen.");
        }
      });
    },
    [pitchAllocations, unassign],
  );

  const handleDressingSelect = useCallback(
    (facilityResourceId: string) => {
      setError(null);
      startTransition(async () => {
        try {
          await assignOrReplace("DRESSING_ROOM", facilityResourceId);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Zuweisung fehlgeschlagen.");
        }
      });
    },
    [assignOrReplace],
  );

  const handleDressingDeselect = useCallback(
    (facilityResourceId: string) => {
      const row = dressingAllocations.find((a) => a.facilityResourceId === facilityResourceId);
      if (!row) return;
      setError(null);
      startTransition(async () => {
        try {
          await unassign(row.id);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Entfernen fehlgeschlagen.");
        }
      });
    },
    [dressingAllocations, unassign],
  );

  const pitchName =
    pitchAllocations.length === 0
      ? null
      : pitchAllocations.map((a) => a.facilityResourceName).join(", ");
  const dressingName =
    dressingAllocations.length === 0
      ? null
      : dressingAllocations.map((a) => a.facilityResourceName).join(", ");

  return (
    <div className="space-y-4" data-testid="veranstaltung-facility-allocation-editor">
      <PlanningSingleResourceAssignment
        kind="pitch_hall"
        subjectLabel="Spielfeld / Halle"
        resourceName={pitchName}
        unassignedLabel="Noch kein Spielfeld / keine Halle zugewiesen."
        facilityGroups={pitchHallFacilityGroups}
        selectedResourceIds={pitchSelectedIds}
        onSelect={handlePitchSelect}
        onDeselect={handlePitchDeselect}
        availabilityByResourceId={pitchAvailabilityByResourceId}
        canManage={canManage}
        disabled={isPending}
        testId="veranstaltung-pitch-allocation"
      />

      <PlanningSingleResourceAssignment
        kind="dressing_room"
        subjectLabel="Garderobe"
        resourceName={dressingName}
        unassignedLabel="Noch keine Garderobe zugewiesen."
        facilityGroups={dressingRoomFacilityGroups}
        selectedResourceIds={dressingSelectedIds}
        onSelect={handleDressingSelect}
        onDeselect={handleDressingDeselect}
        availabilityByResourceId={dressingRoomAvailabilityByResourceId}
        canManage={canManage}
        disabled={isPending}
        testId="veranstaltung-dressing-allocation"
      />

      {error ? (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
