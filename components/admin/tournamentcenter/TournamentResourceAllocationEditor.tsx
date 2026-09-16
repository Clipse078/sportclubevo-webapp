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
  FacilityResourceSelector,
  type FacilityGroup,
  type ResourceAvailabilityAnnotation,
} from "@/components/admin/training/FacilityResourceSelector";
import { FacilityResourceIdentity } from "@/components/admin/shared/planning/FacilityResourceIdentity";
import type { FacilityResourceType } from "@prisma/client";

type Props = {
  tournamentId: string;
  canManage: boolean;
  initialAllocations: TournamentResourceAllocationDto[];
  facilityGroups: FacilityGroup[];
  availabilityByResourceId?: Map<string, ResourceAvailabilityAnnotation>;
};

function lookupResourceMeta(
  facilityGroups: FacilityGroup[],
  resourceId: string,
): { type: FacilityResourceType; facilityType?: string; typeLabel: string } {
  for (const fg of facilityGroups) {
    const resource = fg.resources.find((r) => r.id === resourceId);
    if (resource) {
      const typeLabel =
        resource.type === "FULL_PITCH"
          ? "Spielfeld"
          : resource.type === "HALF_PITCH"
            ? "Halbes Feld"
            : fg.facilityType === "INDOOR_HALL"
              ? "Halle"
              : "Ressource";
      return {
        type: resource.type,
        facilityType: resource.facilityType ?? fg.facilityType,
        typeLabel,
      };
    }
  }
  return { type: "OTHER", typeLabel: "Ressource" };
}

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

  return (
    <div className="space-y-3" data-testid="tournament-resource-allocation-editor">
      {allocations.length === 0 ? (
        <p className="text-sm text-[var(--text-2)]">Noch kein Spielfeld / keine Halle zugewiesen.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]" data-testid="tournament-resource-allocation-list">
          {allocations.map((allocation) => {
            const meta = lookupResourceMeta(facilityGroups, allocation.facilityResourceId);
            return (
              <li
                key={allocation.id}
                className="flex items-center gap-2 bg-[var(--surface)] px-3 py-2"
              >
                <FacilityResourceIdentity
                  name={allocation.facilityResourceName}
                  resourceType={meta.type}
                  facilityType={meta.facilityType}
                  subtitle={`${meta.typeLabel} · ${allocation.facilityName}`}
                  compact
                  className="min-w-0 flex-1"
                />

                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleRemove(allocation.id)}
                    disabled={isPending}
                    aria-label={`${allocation.facilityResourceName} entfernen`}
                    className="shrink-0 rounded p-1.5 text-[var(--muted)] transition hover:bg-rose-500/10 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}

      {canManage && (
        <FacilityResourceSelector
          facilityGroups={facilityGroups}
          allocatedResourceIds={allocatedResourceIds}
          onAdd={handleAdd}
          placeholder="Spielfeld / Halle auswählen…"
          addButtonLabel="Zuweisen"
          availabilityByResourceId={availabilityByResourceId}
          testId="tournament-resource-allocation-add"
        />
      )}
    </div>
  );
}
