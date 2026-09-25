"use client";

/**
 * components/admin/tournamentcenter/TournamentResourceAllocationEditor.tsx
 *
 * TOURNAMENTCENTER-01B — facility allocation presentation with shared pitch/hall identity.
 */

import { useCallback, useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";
import type { TournamentResourceAllocationDto } from "@/lib/tournaments/types";
import {
  type FacilityGroup,
  type ResourceAvailabilityAnnotation,
} from "@/components/admin/training/FacilityResourceSelector";
import { PlanningSingleResourceAssignment } from "@/components/admin/shared/planning/PlanningSingleResourceAssignment";
type Props = {
  tournamentId: string;
  canManage: boolean;
  initialAllocations: TournamentResourceAllocationDto[];
  facilityGroups: FacilityGroup[];
  availabilityByResourceId?: Map<string, ResourceAvailabilityAnnotation>;
};

export default function TournamentResourceAllocationEditor({
  tournamentId,
  canManage,
  initialAllocations,
  facilityGroups,
  availabilityByResourceId,
}: Props) {
  const [allocations, setAllocations] = useState<TournamentResourceAllocationDto[]>(initialAllocations);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const allocatedResourceIds = useMemo(
    () => new Set(allocations.map((a) => a.facilityResourceId)),
    [allocations],
  );

  const handleAdd = useCallback(
    async (facilityResourceId: string) => {
      const res = await fetch(`/api/tournaments/${tournamentId}/resource-allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityResourceId }),
      });
      const data = (await res.json().catch(() => null)) as
        | { allocation?: TournamentResourceAllocationDto; error?: string }
        | null;
      if (!res.ok || !data?.allocation) {
        throw new Error(data?.error ?? "Ressource konnte nicht zugewiesen werden.");
      }
      setAllocations((prev) => [...prev, data.allocation as TournamentResourceAllocationDto]);
    },
    [tournamentId],
  );

  const handleRemove = useCallback(
    (allocationId: string) => {
      setError(null);
      startTransition(async () => {
        try {
          const res = await fetch(
            `/api/tournaments/${tournamentId}/resource-allocations/${allocationId}`,
            { method: "DELETE" },
          );
          if (!res.ok) {
            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            throw new Error(data?.error ?? "Ressource konnte nicht entfernt werden.");
          }
          setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Ressource konnte nicht entfernt werden.");
        }
      });
    },
    [tournamentId],
  );

  const primaryName =
    allocations.length === 0
      ? null
      : allocations.map((a) => a.facilityResourceName).join(", ");

  const handleSelectPitch = useCallback(
    async (facilityResourceId: string) => {
      setError(null);
      startTransition(async () => {
        try {
          await handleAdd(facilityResourceId);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Ressource konnte nicht zugewiesen werden.");
        }
      });
    },
    [handleAdd],
  );

  const handleDeselectPitch = useCallback(
    (facilityResourceId: string) => {
      const allocation = allocations.find((a) => a.facilityResourceId === facilityResourceId);
      if (!allocation) return;
      handleRemove(allocation.id);
    },
    [allocations, handleRemove],
  );

  return (
    <div className="space-y-3" data-testid="tournament-resource-allocation-editor">
      <PlanningSingleResourceAssignment
        kind="pitch_hall"
        showSubjectLabel={false}
        subjectLabel="Spielfeld / Halle"
        resourceName={primaryName}
        unassignedLabel="Noch kein Spielfeld / keine Halle zugewiesen."
        facilityGroups={facilityGroups}
        selectedResourceIds={allocatedResourceIds}
        onSelect={handleSelectPitch}
        onDeselect={handleDeselectPitch}
        availabilityByResourceId={availabilityByResourceId}
        canManage={canManage}
        disabled={isPending}
        testId="tournament-resource-allocation"
      />

      {allocations.length > 1 ? (
        <ul className="space-y-1 text-xs text-[var(--text-2)]" data-testid="tournament-resource-allocation-list">
          {allocations.map((allocation) => (
            <li key={allocation.id} className="flex items-center justify-between gap-2">
              <span>{allocation.facilityResourceName}</span>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => handleRemove(allocation.id)}
                  disabled={isPending}
                  aria-label={`${allocation.facilityResourceName} entfernen`}
                  className="shrink-0 rounded p-1 text-[var(--muted)] hover:text-rose-600 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {error && (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
