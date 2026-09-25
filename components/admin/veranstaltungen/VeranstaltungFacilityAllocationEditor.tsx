"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import {
  classifyFacilityResourceType,
  TRAINING_ALLOCATION_GROUP_LABELS,
} from "@/lib/training/allocation-groups";
import type { EventFacilityAllocationDto } from "@/lib/events/event-facility-allocation-types";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { ResourceAvailabilityAnnotation } from "@/components/admin/training/FacilityResourceSelector";
import { PlanningSingleResourceAssignment } from "@/components/admin/shared/planning/PlanningSingleResourceAssignment";
import { PLANNING_RESOURCE_SECTION_LABEL_CLASS } from "@/components/admin/shared/planning-editor/planning-editor-layout";
import { PlanningResourcePicker } from "@/components/admin/shared/planning/PlanningResourcePicker";

type Props = {
  eventId: string;
  canManage: boolean;
  initialAllocations: EventFacilityAllocationDto[];
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  otherFacilityGroups?: FacilityGroup[];
  pitchAvailabilityByResourceId?: Map<string, ResourceAvailabilityAnnotation>;
  dressingRoomAvailabilityByResourceId?: Map<string, ResourceAvailabilityAnnotation>;
};

function allocationsForGroup(
  allocations: EventFacilityAllocationDto[],
  group: "PITCH_HALL" | "DRESSING_ROOM" | "OTHER",
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
  otherFacilityGroups = [],
  pitchAvailabilityByResourceId,
  dressingRoomAvailabilityByResourceId,
}: Props) {
  const [allocations, setAllocations] = useState(initialAllocations);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [otherPickerOpen, setOtherPickerOpen] = useState(false);
  const [otherPickerError, setOtherPickerError] = useState<string | null>(null);

  const pitchAllocations = useMemo(
    () => allocationsForGroup(allocations, "PITCH_HALL"),
    [allocations],
  );
  const dressingAllocations = useMemo(
    () => allocationsForGroup(allocations, "DRESSING_ROOM"),
    [allocations],
  );
  const otherAllocations = useMemo(
    () => allocationsForGroup(allocations, "OTHER"),
    [allocations],
  );
  const showOtherSection =
    otherFacilityGroups.length > 0 || otherAllocations.length > 0;

  const pitchSelectedIds = useMemo(
    () => new Set(pitchAllocations.map((a) => a.facilityResourceId)),
    [pitchAllocations],
  );
  const dressingSelectedIds = useMemo(
    () => new Set(dressingAllocations.map((a) => a.facilityResourceId)),
    [dressingAllocations],
  );
  const otherSelectedIds = useMemo(
    () => new Set(otherAllocations.map((a) => a.facilityResourceId)),
    [otherAllocations],
  );
  const allSelectedIds = useMemo(
    () => new Set(allocations.map((a) => a.facilityResourceId)),
    [allocations],
  );

  const assignResource = useCallback(
    async (facilityResourceId: string) => {
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
    [eventId],
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

      await assignResource(facilityResourceId);
    },
    [allocations, assignResource, eventId],
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
      <div className="space-y-2">
        <p className={PLANNING_RESOURCE_SECTION_LABEL_CLASS}>Spielfeld / Halle</p>
      <PlanningSingleResourceAssignment
        kind="pitch_hall"
        showSubjectLabel={false}
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
      </div>

      <div className="space-y-2">
        <p className={PLANNING_RESOURCE_SECTION_LABEL_CLASS}>Garderobe</p>
      <PlanningSingleResourceAssignment
        kind="dressing_room"
        showSubjectLabel={false}
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
      </div>

      {showOtherSection ? (
        <details
          className="group rounded-lg border border-[var(--border)] px-3 py-2"
          data-testid="veranstaltung-other-allocation"
          open={otherAllocations.length > 0}
        >
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-[var(--text-2)]">
            <ChevronDown
              size={14}
              className="text-[var(--muted)] transition-transform group-open:rotate-180"
              aria-hidden
            />
            {TRAINING_ALLOCATION_GROUP_LABELS.OTHER}
          </summary>
          <div className="mt-3 space-y-2">
            {otherAllocations.length > 0 ? (
              <ul className="space-y-1 text-sm text-[var(--foreground)]">
                {otherAllocations.map((a) => (
                  <li key={a.id} className="flex justify-between gap-2">
                    <span>{a.facilityResourceName}</span>
                    {canManage ? (
                      <button
                        type="button"
                        className="text-xs text-[var(--sce-danger)]"
                        disabled={isPending}
                        onClick={() => {
                          setError(null);
                          startTransition(async () => {
                            try {
                              await unassign(a.id);
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Entfernen fehlgeschlagen.");
                            }
                          });
                        }}
                      >
                        Entfernen
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {canManage ? (
              <>
                {!otherPickerOpen ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-[var(--sce-primary)] hover:underline"
                    disabled={isPending}
                    onClick={() => {
                      setOtherPickerError(null);
                      setOtherPickerOpen(true);
                    }}
                    data-testid="veranstaltung-other-allocation-add"
                  >
                    {otherAllocations.length > 0
                      ? "Weitere Ressource hinzufügen"
                      : "Ressource zuweisen"}
                  </button>
                ) : null}
                {otherPickerOpen ? (
                  <div className="space-y-2">
                    {otherPickerError ? (
                      <p className="text-xs text-[var(--sce-danger)]" role="alert">
                        {otherPickerError}
                      </p>
                    ) : null}
                    <PlanningResourcePicker
                      kind="other"
                      title={TRAINING_ALLOCATION_GROUP_LABELS.OTHER}
                      facilityGroups={otherFacilityGroups}
                      selectedResourceIds={allSelectedIds}
                      singleSelect={false}
                      disabled={isPending}
                      onSelect={(id) => {
                        if (otherSelectedIds.has(id)) return;
                        setOtherPickerError(null);
                        startTransition(async () => {
                          try {
                            await assignResource(id);
                          } catch (err) {
                            setOtherPickerError(
                              err instanceof Error ? err.message : "Zuweisung fehlgeschlagen.",
                            );
                          }
                        });
                      }}
                      onDeselect={(id) => {
                        const row = otherAllocations.find((a) => a.facilityResourceId === id);
                        if (!row) return;
                        setOtherPickerError(null);
                        startTransition(async () => {
                          try {
                            await unassign(row.id);
                          } catch (err) {
                            setOtherPickerError(
                              err instanceof Error ? err.message : "Entfernen fehlgeschlagen.",
                            );
                          }
                        });
                      }}
                      testId="veranstaltung-other-allocation-picker"
                      onCancel={() => {
                        setOtherPickerError(null);
                        setOtherPickerOpen(false);
                      }}
                    />
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </details>
      ) : null}

      {error ? (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
