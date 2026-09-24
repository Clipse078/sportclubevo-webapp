"use client";

import { useCallback, useState, useTransition } from "react";
import { Building2, Loader2, RotateCcw, X } from "lucide-react";
import type { TrainingAllocationDto, TrainingSessionAllocationDto } from "@/lib/training/types";
import type { FacilityGroup, ResourceAvailabilityAnnotation } from "./FacilityResourceSelector";
import { FacilityResourceSelector } from "./FacilityResourceSelector";
import type { FacilityResourceType } from "@prisma/client";
import {
  groupAllocationsByAllocationGroup,
  splitFacilityGroupsByAllocationGroup,
  TRAINING_ALLOCATION_GROUP_LABELS,
  type TrainingAllocationGroupKey,
} from "@/lib/training/allocation-groups";
import { useFacilityAvailability } from "@/hooks/use-facility-availability";
type Props = {
  sessionId: string;
  initialAllocations: TrainingSessionAllocationDto[];
  seriesAllocations: TrainingAllocationDto[];
  facilityGroups: FacilityGroup[];
  canManage: boolean;
  sessionStartAt: string;
  sessionEndAt: string;
};

const RESOURCE_TYPE_LABELS: Record<FacilityResourceType, string> = {
  FULL_PITCH: "Ganzes Feld",
  HALF_PITCH: "Halbes Feld",
  DRESSING_ROOM: "Garderobe",
  OTHER: "Sonstiges",
};

type AllocationLike = {
  id: string;
  facilityResourceId: string;
  facilityResourceName: string;
  facilityResourceCode: string;
  facilityResourceType: string;
  facilityName: string;
  notes: string | null;
};

function formatAllocationSubtitle(allocation: AllocationLike): string {
  const typeLabel =
    RESOURCE_TYPE_LABELS[allocation.facilityResourceType as FacilityResourceType] ??
    allocation.facilityResourceType;
  return `${allocation.facilityName} · ${typeLabel}`;
}

function GroupSection({
  groupKey,
  overrideRows,
  seriesRows,
  facilityGroupsForAdd,
  onAdd,
  onRemove,
  onUseSeriesDefault,
  canManage,
  availabilityByResourceId,
  pickerOpen,
  onOpenPicker,
  onClosePicker,
}: {
  groupKey: TrainingAllocationGroupKey;
  overrideRows: TrainingSessionAllocationDto[];
  seriesRows: TrainingAllocationDto[];
  facilityGroupsForAdd: FacilityGroup[];
  onAdd: (resourceId: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onUseSeriesDefault: () => Promise<void>;
  canManage: boolean;
  availabilityByResourceId?: Map<string, ResourceAvailabilityAnnotation>;
  pickerOpen: boolean;
  onOpenPicker: () => void;
  onClosePicker: () => void;
}) {
  const isOverridden = overrideRows.length > 0;
  const rowsToShow: AllocationLike[] = isOverridden ? overrideRows : seriesRows;
  const label = TRAINING_ALLOCATION_GROUP_LABELS[groupKey];
  const testIdSuffix = groupKey.toLowerCase().replace(/_/g, "-");
  const [resetting, setResetting] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleUseSeriesDefault = useCallback(async () => {
    setResetting(true);
    try {
      await onUseSeriesDefault();
      onClosePicker();
    } finally {
      setResetting(false);
    }
  }, [onUseSeriesDefault, onClosePicker]);

  const handleAdd = useCallback(
    async (resourceId: string) => {
      setAdding(true);
      try {
        await onAdd(resourceId);
        onClosePicker();
      } finally {
        setAdding(false);
      }
    },
    [onAdd, onClosePicker],
  );

  return (
    <div
      className="border-b border-[var(--border)] py-3 last:border-b-0 last:pb-0 first:pt-0"
      data-testid={`training-session-allocations-${testIdSuffix}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
          {rowsToShow.length === 0 ? (
            <p className="text-sm text-[var(--text-2)]">Keine Ressource zugewiesen.</p>
          ) : (
            rowsToShow.map((row) => (
              <div key={row.id} className="min-w-0">
                <p
                  className="truncate text-sm font-medium text-[var(--foreground)]"
                  data-testid={`training-session-allocation-name-${testIdSuffix}`}
                >
                  {row.facilityResourceName}
                </p>
                <p className="flex min-w-0 items-center gap-1 text-xs text-[var(--text-2)]">
                  <Building2 size={11} className="shrink-0 opacity-70" aria-hidden />
                  <span className="truncate">{formatAllocationSubtitle(row)}</span>
                </p>
              </div>
            ))
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {isOverridden ? (
            <span
              className="inline-flex h-5 items-center rounded-full border border-[var(--blue)]/30 bg-[var(--blue)]/10 px-2 text-[0.65rem] font-medium text-[var(--blue)]"
              data-testid={`training-session-allocations-${testIdSuffix}-override-badge`}
            >
              Abweichend
            </span>
          ) : (
            <span
              className="inline-flex h-5 items-center rounded-full border border-[var(--border)] bg-[var(--surface-3)] px-2 text-[0.65rem] font-medium text-[var(--text-2)]"
              data-testid={`training-session-allocations-${testIdSuffix}-inherit-badge`}
            >
              Serienstandard
            </span>
          )}
          {canManage && !pickerOpen ? (
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={onOpenPicker}
                data-testid={`training-session-allocations-${testIdSuffix}-change`}
                className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
              >
                Ändern
              </button>
              {isOverridden ? (
                <button
                  type="button"
                  onClick={handleUseSeriesDefault}
                  disabled={resetting}
                  data-testid={`training-session-allocations-${testIdSuffix}-use-default`}
                  className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[0.65rem] font-medium text-[var(--text-2)] transition hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resetting ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                  Serienstandard wiederherstellen
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {pickerOpen && canManage ? (
        <div
          className="mt-3 space-y-2 border-t border-[var(--border)] pt-3"
          data-testid={`training-session-allocations-${testIdSuffix}-picker`}
        >
          {isOverridden ? (
            <ul className="space-y-1">
              {overrideRows.map((row) => (
                <OverrideRemoveRow key={row.id} allocation={row} onRemove={onRemove} />
              ))}
            </ul>
          ) : null}

          <FacilityResourceSelector
            facilityGroups={facilityGroupsForAdd}
            allocatedResourceIds={new Set(rowsToShow.map((r) => r.facilityResourceId))}
            onAdd={handleAdd}
            disabled={adding}
            testId={`training-session-allocation-add-${testIdSuffix}`}
            placeholder="Für dieses Training auswählen…"
            addButtonLabel="Für dieses Training zuweisen"
            availabilityByResourceId={availabilityByResourceId}
          />

          <button
            type="button"
            onClick={onClosePicker}
            data-testid={`training-session-allocations-${testIdSuffix}-picker-cancel`}
            className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          >
            Abbrechen
          </button>
        </div>
      ) : null}
    </div>
  );
}

function OverrideRemoveRow({
  allocation,
  onRemove,
}: {
  allocation: AllocationLike;
  onRemove: (id: string) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/80 px-2 py-1.5 text-xs">
      <span className="truncate text-[var(--foreground)]">{allocation.facilityResourceName}</span>
      <button
        type="button"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await onRemove(allocation.id);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Fehler beim Entfernen");
            }
          });
        }}
        disabled={isPending}
        aria-label={`Zuweisung von ${allocation.facilityResourceName} entfernen`}
        className="shrink-0 rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
      </button>
      {error ? (
        <p className="sr-only" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export function TrainingSessionAllocationEditor({
  sessionId,
  initialAllocations,
  seriesAllocations,
  facilityGroups,
  canManage,
  sessionStartAt,
  sessionEndAt,
}: Props) {
  const [allocations, setAllocations] = useState<TrainingSessionAllocationDto[]>(initialAllocations);
  const [openPickerGroup, setOpenPickerGroup] = useState<TrainingAllocationGroupKey | null>(null);

  const { pitchAvailability, dressingRoomAvailability } = useFacilityAvailability({
    enabled: openPickerGroup !== null,
    startAt: sessionStartAt,
    endAt: sessionEndAt,
    excludeTrainingSessionId: sessionId,
  });

  const overridesByGroup = groupAllocationsByAllocationGroup(allocations);
  const seriesByGroup = groupAllocationsByAllocationGroup(seriesAllocations);
  const facilityGroupsByGroup = splitFacilityGroupsByAllocationGroup(facilityGroups);
  const hasOtherResources =
    facilityGroupsByGroup.OTHER.length > 0 ||
    overridesByGroup.OTHER.length > 0 ||
    seriesByGroup.OTHER.length > 0;

  const handleAdd = useCallback(
    async (facilityResourceId: string) => {
      const res = await fetch(`/api/training-sessions/${sessionId}/allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityResourceId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Fehler: HTTP ${res.status}`);
      }

      const data = (await res.json()) as { allocation: TrainingSessionAllocationDto };
      setAllocations((prev) => [...prev, data.allocation].sort((a, b) => a.displayOrder - b.displayOrder));
    },
    [sessionId],
  );

  const handleRemove = useCallback(
    async (allocationId: string) => {
      const res = await fetch(`/api/training-sessions/${sessionId}/allocations/${allocationId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Fehler: HTTP ${res.status}`);
      }

      setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
    },
    [sessionId],
  );

  const handleUseSeriesDefaultForGroup = useCallback(
    async (groupKey: TrainingAllocationGroupKey) => {
      const rowsToClear = groupAllocationsByAllocationGroup(allocations)[groupKey];
      for (const row of rowsToClear) {
        await handleRemove(row.id);
      }
    },
    [allocations, handleRemove],
  );

  const sectionProps = (groupKey: TrainingAllocationGroupKey, availability?: Map<string, ResourceAvailabilityAnnotation>) => ({
    groupKey,
    overrideRows: overridesByGroup[groupKey],
    seriesRows: seriesByGroup[groupKey],
    facilityGroupsForAdd: facilityGroupsByGroup[groupKey],
    onAdd: handleAdd,
    onRemove: handleRemove,
    onUseSeriesDefault: () => handleUseSeriesDefaultForGroup(groupKey),
    canManage,
    availabilityByResourceId: availability,
    pickerOpen: openPickerGroup === groupKey,
    onOpenPicker: () => setOpenPickerGroup(groupKey),
    onClosePicker: () => setOpenPickerGroup((current) => (current === groupKey ? null : current)),
  });

  return (
    <div className="space-y-3" data-testid="training-session-allocation-editor">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">Ressourcen</h2>
      </div>

      <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 px-3">
        <GroupSection {...sectionProps("PITCH_HALL", pitchAvailability)} />
        <GroupSection {...sectionProps("DRESSING_ROOM", dressingRoomAvailability)} />
        {hasOtherResources ? <GroupSection {...sectionProps("OTHER")} /> : null}
      </div>
    </div>
  );
}
