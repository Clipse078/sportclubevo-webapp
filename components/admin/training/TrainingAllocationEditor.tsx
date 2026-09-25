"use client";

import { useState, useCallback } from "react";
import { MapPin, ChevronDown, LayoutGrid, DoorOpen } from "lucide-react";
import type { TrainingAllocationDto } from "@/lib/training/types";
import type { FacilityGroup } from "./FacilityResourceSelector";
import { PlanningResourcePicker } from "@/components/admin/shared/planning/PlanningResourcePicker";
import type { FacilityResourceType } from "@prisma/client";
import { cn } from "@/lib/cn";
import {
  groupAllocationsByAllocationGroup,
  splitFacilityGroupsByAllocationGroup,
  TRAINING_ALLOCATION_GROUP_LABELS,
  type TrainingAllocationGroupKey,
} from "@/lib/training/allocation-groups";

// ── Types ─────────────────────────────────────────────────────────────────────

type Layout = "standalone" | "workspace";

type Props = {
  trainingSeriesId: string;
  trainingSeriesTitle: string;
  initialAllocations: TrainingAllocationDto[];
  facilityGroups: FacilityGroup[];
  canManage: boolean;
  /** @deprecated use layout="workspace" */
  embedded?: boolean;
  layout?: Layout;
};

const RESOURCE_TYPE_LABELS: Record<FacilityResourceType, string> = {
  FULL_PITCH: "Ganzes Feld",
  HALF_PITCH: "Halbes Feld",
  DRESSING_ROOM: "Garderobe",
  OTHER: "Sonstiges",
};

function resolveLayout(embedded: boolean | undefined, layout: Layout | undefined): Layout {
  if (layout) return layout;
  return embedded ? "workspace" : "standalone";
}

// ── Workspace compact resource block (PLANNING-UX-07R4) ───────────────────────

function WorkspaceResourceBlock({
  kind,
  title,
  allocations,
  canManage,
  facilityGroups,
  allocatedIds,
  onAdd,
  onRemove,
  testId,
  changeTestId,
  selectorTestId,
}: {
  kind: "pitch" | "dressing";
  title: string;
  allocations: TrainingAllocationDto[];
  canManage: boolean;
  facilityGroups: FacilityGroup[];
  allocatedIds: Set<string>;
  onAdd: (resourceId: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  testId: string;
  changeTestId: string;
  selectorTestId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const primary = allocations[0];
  const iconClass =
    kind === "pitch"
      ? "text-emerald-400 bg-emerald-500/10 ring-emerald-500/25"
      : "text-[var(--blue)] bg-[var(--blue)]/10 ring-[var(--blue)]/25";

  return (
    <div data-testid={testId} className="space-y-2">
      <p className="text-xs font-semibold text-[var(--foreground)]">{title}</p>
      {primary ? (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-2.5">
          <div className="flex min-w-0 items-start gap-2.5">
            <span
              className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1", iconClass)}
              aria-hidden="true"
            >
              {kind === "pitch" ? <LayoutGrid className="h-4 w-4" /> : <DoorOpen className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-[var(--foreground)]">{primary.facilityResourceName}</p>
              <p className="text-xs text-[var(--muted)]">
                {RESOURCE_TYPE_LABELS[primary.facilityResourceType as FacilityResourceType] ??
                  primary.facilityResourceType}
              </p>
            </div>
          </div>
          {canManage ? (
            <button
              type="button"
              className="text-xs font-semibold text-[var(--sce-primary)] hover:underline"
              onClick={() => {
                setPickerError(null);
                setEditing((v) => !v);
              }}
              data-testid={changeTestId}
            >
              Ändern
            </button>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--border)] px-3 py-3 text-sm text-[var(--muted)]">
          Nicht zugewiesen
          {canManage ? (
            <button
              type="button"
              className="ml-2 text-xs font-semibold text-[var(--sce-primary)] hover:underline"
              onClick={() => {
                setPickerError(null);
                setEditing(true);
              }}
              data-testid={changeTestId}
            >
              Zuweisen
            </button>
          ) : null}
        </div>
      )}

      {canManage && editing ? (
        <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]/80 p-3">
          {primary ? (
            <button
              type="button"
              className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
              onClick={() => onRemove(primary.id)}
            >
              Aktuelle Zuweisung entfernen
            </button>
          ) : null}
          {pickerError ? (
            <p className="text-xs text-[var(--sce-danger)]" role="alert">
              {pickerError}
            </p>
          ) : null}
          <PlanningResourcePicker
            kind={kind === "pitch" ? "pitch_hall" : "dressing_room"}
            title={title}
            facilityGroups={facilityGroups}
            selectedResourceIds={allocatedIds}
            onSelect={async (id) => {
              try {
                await onAdd(id);
                setPickerError(null);
                setEditing(false);
              } catch (err) {
                setPickerError(err instanceof Error ? err.message : "Fehler beim Zuweisen");
              }
            }}
            onDeselect={async (id) => {
              const row = allocations.find((a) => a.facilityResourceId === id);
              if (row) await onRemove(row.id);
            }}
            testId={selectorTestId}
            onCancel={() => {
              setPickerError(null);
              setEditing(false);
            }}
          />
        </div>
      ) : null}

      {allocations.length > 1 ? (
        <ul className="space-y-1 pl-1 text-xs text-[var(--text-2)]">
          {allocations.slice(1).map((allocation) => (
            <li key={allocation.id} className="flex items-center justify-between gap-2">
              <span>{allocation.facilityResourceName}</span>
              {canManage ? (
                <button
                  type="button"
                  className="text-[var(--sce-danger)] hover:underline"
                  onClick={() => onRemove(allocation.id)}
                >
                  Entfernen
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function OtherResourcesBlock({
  allocations,
  canManage,
  facilityGroups,
  allocatedIds,
  onAdd,
  onRemove,
}: {
  allocations: TrainingAllocationDto[];
  canManage: boolean;
  facilityGroups: FacilityGroup[];
  allocatedIds: Set<string>;
  onAdd: (resourceId: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  return (
    <details
      className="group rounded-lg border border-[var(--border)] px-3 py-2"
      data-testid="training-allocations-other"
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
        {allocations.length > 0 ? (
          <ul className="space-y-1 text-sm text-[var(--foreground)]">
            {allocations.map((a) => (
              <li key={a.id} className="flex justify-between gap-2">
                <span>{a.facilityResourceName}</span>
                {canManage ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--sce-danger)]"
                    onClick={() => onRemove(a.id)}
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
            {!editing ? (
              <button
                type="button"
                className="text-xs font-semibold text-[var(--sce-primary)] hover:underline"
                onClick={() => {
                  setPickerError(null);
                  setEditing(true);
                }}
                data-testid="training-allocation-change-other"
              >
                {allocations.length > 0 ? "Weitere Ressource hinzufügen" : "Ressource zuweisen"}
              </button>
            ) : null}
            {editing ? (
              <div className="space-y-2">
                {pickerError ? (
                  <p className="text-xs text-[var(--sce-danger)]" role="alert">
                    {pickerError}
                  </p>
                ) : null}
                <PlanningResourcePicker
                  kind="other"
                  title={TRAINING_ALLOCATION_GROUP_LABELS.OTHER}
                  facilityGroups={facilityGroups}
                  selectedResourceIds={allocatedIds}
                  singleSelect={false}
                  onSelect={async (id) => {
                    try {
                      await onAdd(id);
                      setPickerError(null);
                    } catch (err) {
                      setPickerError(err instanceof Error ? err.message : "Fehler beim Zuweisen");
                    }
                  }}
                  onDeselect={async (id) => {
                    const row = allocations.find((a) => a.facilityResourceId === id);
                    if (row) await onRemove(row.id);
                  }}
                  testId="training-allocation-add-other"
                  onCancel={() => {
                    setPickerError(null);
                    setEditing(false);
                  }}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </details>
  );
}

function SeriesResourceAssignmentBody({
  allocationsByGroup,
  facilityGroupsByGroup,
  allocatedIds,
  canManage,
  hasOtherResources,
  onAdd,
  onRemove,
}: {
  allocationsByGroup: Record<TrainingAllocationGroupKey, TrainingAllocationDto[]>;
  facilityGroupsByGroup: Record<TrainingAllocationGroupKey, FacilityGroup[]>;
  allocatedIds: Set<string>;
  canManage: boolean;
  hasOtherResources: boolean;
  onAdd: (resourceId: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <WorkspaceResourceBlock
        kind="pitch"
        title={TRAINING_ALLOCATION_GROUP_LABELS.PITCH_HALL}
        allocations={allocationsByGroup.PITCH_HALL}
        canManage={canManage}
        facilityGroups={facilityGroupsByGroup.PITCH_HALL}
        allocatedIds={allocatedIds}
        onAdd={onAdd}
        onRemove={onRemove}
        testId="training-allocations-pitch-hall"
        changeTestId="training-allocation-change-pitch-hall"
        selectorTestId="training-allocation-add-pitch-hall"
      />
      <WorkspaceResourceBlock
        kind="dressing"
        title={TRAINING_ALLOCATION_GROUP_LABELS.DRESSING_ROOM}
        allocations={allocationsByGroup.DRESSING_ROOM}
        canManage={canManage}
        facilityGroups={facilityGroupsByGroup.DRESSING_ROOM}
        allocatedIds={allocatedIds}
        onAdd={onAdd}
        onRemove={onRemove}
        testId="training-allocations-dressing-room"
        changeTestId="training-allocation-change-dressing-room"
        selectorTestId="training-allocation-add-dressing-room"
      />
      {hasOtherResources ? (
        <OtherResourcesBlock
          allocations={allocationsByGroup.OTHER}
          canManage={canManage}
          facilityGroups={facilityGroupsByGroup.OTHER}
          allocatedIds={allocatedIds}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      ) : null}
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────

export function TrainingAllocationEditor({
  trainingSeriesId,
  trainingSeriesTitle,
  initialAllocations,
  facilityGroups,
  canManage,
  embedded = false,
  layout,
}: Props) {
  const resolvedLayout = resolveLayout(embedded, layout);
  const [allocations, setAllocations] = useState<TrainingAllocationDto[]>(initialAllocations);

  const allocatedIds = new Set(allocations.map((a) => a.facilityResourceId));
  const allocationsByGroup = groupAllocationsByAllocationGroup(allocations);
  const facilityGroupsByGroup = splitFacilityGroupsByAllocationGroup(facilityGroups);
  const hasOtherResources =
    facilityGroupsByGroup.OTHER.length > 0 || allocationsByGroup.OTHER.length > 0;

  const handleAdd = useCallback(
    async (facilityResourceId: string) => {
      const res = await fetch(`/api/training-series/${trainingSeriesId}/allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityResourceId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Fehler: HTTP ${res.status}`);
      }

      const data = (await res.json()) as { allocation: TrainingAllocationDto };
      setAllocations((prev) =>
        [...prev, data.allocation].sort((a, b) => a.displayOrder - b.displayOrder),
      );
    },
    [trainingSeriesId],
  );

  const handleRemove = useCallback(
    async (allocationId: string) => {
      const res = await fetch(
        `/api/training-series/${trainingSeriesId}/allocations/${allocationId}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Fehler: HTTP ${res.status}`);
      }

      setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
    },
    [trainingSeriesId],
  );

  const assignmentBody = (
    <SeriesResourceAssignmentBody
      allocationsByGroup={allocationsByGroup}
      facilityGroupsByGroup={facilityGroupsByGroup}
      allocatedIds={allocatedIds}
      canManage={canManage}
      hasOtherResources={hasOtherResources}
      onAdd={handleAdd}
      onRemove={handleRemove}
    />
  );

  if (resolvedLayout === "workspace") {
    return (
      <div className="space-y-4" data-testid="training-allocation-editor">
        {assignmentBody}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="training-allocation-editor">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Ressourcen-Zuweisung</h2>
        <p className="mt-1 text-sm text-[var(--text-2)]">
          Weisen Sie Anlagen-Ressourcen der Trainingsserie{" "}
          <span className="font-medium text-[var(--foreground)]">{trainingSeriesTitle}</span> zu.
        </p>
      </div>
      {assignmentBody}
    </div>
  );
}
