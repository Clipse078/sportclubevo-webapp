"use client";

import { useCallback, useState, useTransition } from "react";
import { Building2, DoorOpen, GripVertical, LayoutGrid, Loader2, MapPin, RotateCcw, X } from "lucide-react";
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
import { cn } from "@/lib/cn";

type Layout = "legacy" | "workspace";

type Props = {
  sessionId: string;
  initialAllocations: TrainingSessionAllocationDto[];
  seriesAllocations: TrainingAllocationDto[];
  facilityGroups: FacilityGroup[];
  canManage: boolean;
  sessionStartAt: string;
  sessionEndAt: string;
  layout?: Layout;
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

function AllocationRow({
  allocation,
  onRemove,
  canRemove,
  layout,
  groupKey,
}: {
  allocation: AllocationLike;
  onRemove?: (id: string) => Promise<void>;
  canRemove: boolean;
  layout: Layout;
  groupKey: TrainingAllocationGroupKey;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isWorkspace = layout === "workspace";

  const handleRemove = useCallback(() => {
    if (!onRemove) return;
    setError(null);
    startTransition(async () => {
      try {
        await onRemove(allocation.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fehler beim Entfernen");
      }
    });
  }, [allocation.id, onRemove]);

  if (isWorkspace && groupKey === "DRESSING_ROOM") {
    return (
      <li>
        <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-2)]/60 px-2.5 py-1 text-sm font-semibold text-[var(--foreground)]">
          {allocation.facilityResourceCode}
        </span>
        {error ? (
          <p className="mt-1 text-xs text-[var(--sce-danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </li>
    );
  }

  const rowClass = isWorkspace
    ? "group flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-2.5"
    : "group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm";

  return (
    <li className={rowClass}>
      {!isWorkspace ? <GripVertical size={16} className="shrink-0 text-gray-300" aria-hidden /> : null}

      {isWorkspace && groupKey === "PITCH_HALL" ? (
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25"
          aria-hidden
        >
          <LayoutGrid className="h-4 w-4" />
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate font-medium",
              isWorkspace ? "text-[var(--foreground)]" : "text-gray-900",
            )}
          >
            {allocation.facilityResourceName}
          </span>
          {!isWorkspace ? (
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {RESOURCE_TYPE_LABELS[allocation.facilityResourceType as FacilityResourceType] ??
                allocation.facilityResourceType}
            </span>
          ) : null}
        </div>
        <div
          className={cn(
            "mt-0.5 flex items-center gap-1 text-xs",
            isWorkspace ? "text-[var(--muted)]" : "text-gray-500",
          )}
        >
          <Building2 size={11} aria-hidden />
          <span className="truncate">{allocation.facilityName}</span>
          {!isWorkspace ? (
            <>
              <span className="mx-1 text-gray-300">·</span>
              <MapPin size={11} aria-hidden />
              <span>{allocation.facilityResourceCode}</span>
            </>
          ) : isWorkspace && groupKey === "PITCH_HALL" ? (
            <>
              <span className="mx-1 opacity-40">·</span>
              <span>
                {RESOURCE_TYPE_LABELS[allocation.facilityResourceType as FacilityResourceType] ??
                  allocation.facilityResourceType}
              </span>
            </>
          ) : null}
        </div>
        {error ? (
          <p className={cn("mt-1 text-xs", isWorkspace ? "text-[var(--sce-danger)]" : "text-red-500")} role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {canRemove && onRemove ? (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          aria-label={`Zuweisung von ${allocation.facilityResourceName} entfernen`}
          className={cn(
            "shrink-0 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 disabled:cursor-not-allowed disabled:opacity-50",
            isWorkspace
              ? "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--sce-danger)]"
              : "text-gray-400 hover:bg-red-50 hover:text-red-500",
          )}
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
        </button>
      ) : null}
    </li>
  );
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
  layout,
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
  layout: Layout;
}) {
  const isOverridden = overrideRows.length > 0;
  const rowsToShow: AllocationLike[] = isOverridden ? overrideRows : seriesRows;
  const label = TRAINING_ALLOCATION_GROUP_LABELS[groupKey];
  const testIdSuffix = groupKey.toLowerCase().replace(/_/g, "-");
  const [resetting, setResetting] = useState(false);
  const isWorkspace = layout === "workspace";

  const handleUseSeriesDefault = useCallback(async () => {
    setResetting(true);
    try {
      await onUseSeriesDefault();
    } finally {
      setResetting(false);
    }
  }, [onUseSeriesDefault]);

  const overrideBadge = isOverridden ? (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[0.65rem] font-semibold",
        isWorkspace
          ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/25"
          : "border border-blue-200 bg-blue-50 text-blue-700",
      )}
      data-testid={`training-session-allocations-${testIdSuffix}-override-badge`}
    >
      {isWorkspace ? "Abweichend" : "Für dieses Training angepasst"}
    </span>
  ) : (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[0.65rem] font-medium",
        isWorkspace
          ? "bg-[var(--surface-2)] text-[var(--text-2)] ring-1 ring-[var(--border)]"
          : "border border-gray-200 bg-gray-50 text-gray-500",
      )}
    >
      Serienstandard
    </span>
  );

  return (
    <div data-testid={`training-session-allocations-${testIdSuffix}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            isWorkspace ? "text-[var(--muted)]" : "text-gray-400",
          )}
        >
          {isWorkspace && groupKey === "DRESSING_ROOM" ? (
            <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-[var(--foreground)]">
              <DoorOpen className="h-3.5 w-3.5 text-[var(--blue)]" aria-hidden />
              Garderoben
            </span>
          ) : (
            label
          )}
        </p>
        {overrideBadge}
      </div>

      {rowsToShow.length === 0 ? (
        <p
          className={cn(
            "rounded-lg border-2 border-dashed py-4 text-center text-sm",
            isWorkspace ? "border-[var(--border)] text-[var(--muted)]" : "border-gray-200 text-gray-500",
          )}
        >
          Keine Ressource zugewiesen.
        </p>
      ) : groupKey === "DRESSING_ROOM" && isWorkspace ? (
        <ul className="flex flex-wrap gap-2">
          {rowsToShow.map((row) => (
            <AllocationRow
              key={row.id}
              allocation={row}
              onRemove={isOverridden ? onRemove : undefined}
              canRemove={isOverridden}
              layout={layout}
              groupKey={groupKey}
            />
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {rowsToShow.map((row) => (
            <AllocationRow
              key={row.id}
              allocation={row}
              onRemove={isOverridden ? onRemove : undefined}
              canRemove={isOverridden}
              layout={layout}
              groupKey={groupKey}
            />
          ))}
        </ul>
      )}

      {isOverridden && seriesRows.length > 0 ? (
        <p
          className={cn("mt-2 text-xs", isWorkspace ? "text-[var(--muted)]" : "text-gray-500")}
          data-testid={`training-session-allocations-${testIdSuffix}-series-default`}
        >
          Serienstandard: {seriesRows.map((row) => row.facilityResourceName).join(", ")}
        </p>
      ) : null}

      {canManage ? (
        <div className="mt-2 space-y-2">
          <FacilityResourceSelector
            facilityGroups={facilityGroupsForAdd}
            allocatedResourceIds={new Set(rowsToShow.map((r) => r.facilityResourceId))}
            onAdd={onAdd}
            testId={`training-session-allocation-add-${testIdSuffix}`}
            placeholder="Für dieses Training auswählen…"
            addButtonLabel="Für dieses Training zuweisen"
            availabilityByResourceId={availabilityByResourceId}
          />
          {isOverridden ? (
            <button
              type="button"
              onClick={handleUseSeriesDefault}
              disabled={resetting}
              data-testid={`training-session-allocations-${testIdSuffix}-use-default`}
              className="fca-button-secondary inline-flex items-center gap-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resetting ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              Serienstandard wiederherstellen
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
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
  layout = "legacy",
}: Props) {
  const [allocations, setAllocations] = useState<TrainingSessionAllocationDto[]>(initialAllocations);
  const isWorkspace = layout === "workspace";

  const { pitchAvailability, dressingRoomAvailability } = useFacilityAvailability({
    enabled: true,
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

  return (
    <div className="space-y-5" data-testid="training-session-allocation-editor">
      {!isWorkspace ? (
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Ressourcen für dieses Training</h2>
          <p className="mt-1 text-sm text-gray-500">
            Standardmässig übernimmt dieses Training die Ressourcen seiner Trainingsserie. Weisen Sie hier eine
            abweichende Ressource zu, wenn <span className="font-medium text-gray-700">nur dieser Termin</span>{" "}
            Spielfeld/Halle oder Garderobe wechseln muss — die Serie und alle anderen Termine bleiben unverändert.
          </p>
        </div>
      ) : null}

      <div className="space-y-5">
        <GroupSection
          groupKey="PITCH_HALL"
          overrideRows={overridesByGroup.PITCH_HALL}
          seriesRows={seriesByGroup.PITCH_HALL}
          facilityGroupsForAdd={facilityGroupsByGroup.PITCH_HALL}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onUseSeriesDefault={() => handleUseSeriesDefaultForGroup("PITCH_HALL")}
          canManage={canManage}
          availabilityByResourceId={pitchAvailability}
          layout={layout}
        />
        <GroupSection
          groupKey="DRESSING_ROOM"
          overrideRows={overridesByGroup.DRESSING_ROOM}
          seriesRows={seriesByGroup.DRESSING_ROOM}
          facilityGroupsForAdd={facilityGroupsByGroup.DRESSING_ROOM}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onUseSeriesDefault={() => handleUseSeriesDefaultForGroup("DRESSING_ROOM")}
          canManage={canManage}
          availabilityByResourceId={dressingRoomAvailability}
          layout={layout}
        />
        {hasOtherResources ? (
          <GroupSection
            groupKey="OTHER"
            overrideRows={overridesByGroup.OTHER}
            seriesRows={seriesByGroup.OTHER}
            facilityGroupsForAdd={facilityGroupsByGroup.OTHER}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onUseSeriesDefault={() => handleUseSeriesDefaultForGroup("OTHER")}
            canManage={canManage}
            layout={layout}
          />
        ) : null}
      </div>
    </div>
  );
}
