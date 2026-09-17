"use client";

import { useState, useTransition, useCallback } from "react";
import { Loader2, X, MapPin, Building2, ChevronDown, LayoutGrid, DoorOpen } from "lucide-react";
import type { TrainingAllocationDto } from "@/lib/training/types";
import type { FacilityGroup } from "./FacilityResourceSelector";
import { FacilityResourceSelector } from "./FacilityResourceSelector";
import type { FacilityResourceType } from "@prisma/client";
import { cn } from "@/lib/cn";
import {
  groupAllocationsByAllocationGroup,
  splitFacilityGroupsByAllocationGroup,
  TRAINING_ALLOCATION_GROUP_LABELS,
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

// ── Allocation row (standalone list) ──────────────────────────────────────────

function AllocationRow({
  allocation,
  onRemove,
  canManage,
}: {
  allocation: TrainingAllocationDto;
  onRemove: (id: string) => Promise<void>;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleRemove = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        await onRemove(allocation.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fehler beim Entfernen");
      }
    });
  }, [allocation.id, onRemove]);

  return (
    <li className="group flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-[var(--foreground)]">
            {allocation.facilityResourceName}
          </span>
          <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--text-2)]">
            {RESOURCE_TYPE_LABELS[allocation.facilityResourceType as FacilityResourceType] ??
              allocation.facilityResourceType}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-[var(--muted)]">
          <Building2 size={11} aria-hidden />
          <span className="truncate">{allocation.facilityName}</span>
        </div>
        {allocation.notes ? (
          <p className="mt-1 truncate text-xs italic text-[var(--text-2)]">{allocation.notes}</p>
        ) : null}
        {error ? (
          <p className="mt-1 text-xs text-[var(--sce-danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {canManage ? (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          aria-label={`Zuweisung von ${allocation.facilityResourceName} entfernen`}
          className="shrink-0 rounded p-1 text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--surface-2)] hover:text-[var(--sce-danger)] focus:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
        </button>
      ) : null}
    </li>
  );
}

function AllocationGroupSection({
  title,
  allocations,
  onRemove,
  canManage,
  testId,
}: {
  title: string;
  allocations: TrainingAllocationDto[];
  onRemove: (id: string) => Promise<void>;
  canManage: boolean;
  testId: string;
}) {
  if (allocations.length === 0) return null;

  return (
    <div data-testid={testId}>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {title} ({allocations.length})
      </p>
      <ul className="space-y-2">
        {allocations.map((allocation) => (
          <AllocationRow key={allocation.id} allocation={allocation} onRemove={onRemove} canManage={canManage} />
        ))}
      </ul>
    </div>
  );
}

// ── Workspace compact resource block ───────────────────────────────────────────

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
  const primary = allocations[0];
  const iconClass =
    kind === "pitch" ? "text-emerald-400 bg-emerald-500/10 ring-emerald-500/25" : "text-[var(--blue)] bg-[var(--blue)]/10 ring-[var(--blue)]/25";

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
              onClick={() => setEditing((v) => !v)}
              data-testid={changeTestId}
            >
              {kind === "pitch" ? "Spielfeld ändern" : "Garderobe ändern"}
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
              onClick={() => setEditing(true)}
              data-testid={changeTestId}
            >
              {kind === "pitch" ? "Spielfeld zuweisen" : "Garderobe zuweisen"}
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
          <FacilityResourceSelector
            facilityGroups={facilityGroups}
            allocatedResourceIds={allocatedIds}
            onAdd={async (id) => {
              await onAdd(id);
              setEditing(false);
            }}
            testId={selectorTestId}
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

  if (resolvedLayout === "workspace") {
    return (
      <div className="space-y-4" data-testid="training-allocation-editor">
        <WorkspaceResourceBlock
          kind="pitch"
          title={TRAINING_ALLOCATION_GROUP_LABELS.PITCH_HALL}
          allocations={allocationsByGroup.PITCH_HALL}
          canManage={canManage}
          facilityGroups={facilityGroupsByGroup.PITCH_HALL}
          allocatedIds={allocatedIds}
          onAdd={handleAdd}
          onRemove={handleRemove}
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
          onAdd={handleAdd}
          onRemove={handleRemove}
          testId="training-allocations-dressing-room"
          changeTestId="training-allocation-change-dressing-room"
          selectorTestId="training-allocation-add-dressing-room"
        />
        {hasOtherResources ? (
          <details className="group rounded-lg border border-[var(--border)] px-3 py-2">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-[var(--text-2)]">
              <ChevronDown
                size={14}
                className="text-[var(--muted)] transition-transform group-open:rotate-180"
                aria-hidden
              />
              {TRAINING_ALLOCATION_GROUP_LABELS.OTHER}
            </summary>
            <div className="mt-3 space-y-2">
              {allocationsByGroup.OTHER.length > 0 ? (
                <ul className="space-y-1 text-sm text-[var(--foreground)]">
                  {allocationsByGroup.OTHER.map((a) => (
                    <li key={a.id} className="flex justify-between gap-2">
                      <span>{a.facilityResourceName}</span>
                      {canManage ? (
                        <button type="button" className="text-xs text-[var(--sce-danger)]" onClick={() => handleRemove(a.id)}>
                          Entfernen
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {canManage ? (
                <FacilityResourceSelector
                  facilityGroups={facilityGroupsByGroup.OTHER}
                  allocatedResourceIds={allocatedIds}
                  onAdd={handleAdd}
                  testId="training-allocation-add-other"
                />
              ) : null}
            </div>
          </details>
        ) : null}
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

      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--foreground)]">
          Zugewiesene Ressourcen ({allocations.length})
        </h3>

        {allocations.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-[var(--border)] py-8 text-center">
            <MapPin size={24} className="mx-auto mb-2 text-[var(--muted)]" aria-hidden />
            <p className="text-sm text-[var(--text-2)]">Noch keine Ressourcen zugewiesen.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AllocationGroupSection
              title={TRAINING_ALLOCATION_GROUP_LABELS.PITCH_HALL}
              allocations={allocationsByGroup.PITCH_HALL}
              onRemove={handleRemove}
              canManage={canManage}
              testId="training-allocations-pitch-hall"
            />
            <AllocationGroupSection
              title={TRAINING_ALLOCATION_GROUP_LABELS.DRESSING_ROOM}
              allocations={allocationsByGroup.DRESSING_ROOM}
              onRemove={handleRemove}
              canManage={canManage}
              testId="training-allocations-dressing-room"
            />
            <AllocationGroupSection
              title={TRAINING_ALLOCATION_GROUP_LABELS.OTHER}
              allocations={allocationsByGroup.OTHER}
              onRemove={handleRemove}
              canManage={canManage}
              testId="training-allocations-other"
            />
          </div>
        )}
      </div>

      {canManage ? (
        <div className="space-y-5">
          <h3 className="text-sm font-medium text-[var(--foreground)]">Ressourcen hinzufügen</h3>

          <div>
            <p className="mb-1.5 text-sm font-medium text-[var(--text-2)]">
              {TRAINING_ALLOCATION_GROUP_LABELS.PITCH_HALL} zuweisen
            </p>
            <FacilityResourceSelector
              facilityGroups={facilityGroupsByGroup.PITCH_HALL}
              allocatedResourceIds={allocatedIds}
              onAdd={handleAdd}
              testId="training-allocation-add-pitch-hall"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-[var(--text-2)]">
              {TRAINING_ALLOCATION_GROUP_LABELS.DRESSING_ROOM} zuweisen
            </p>
            <FacilityResourceSelector
              facilityGroups={facilityGroupsByGroup.DRESSING_ROOM}
              allocatedResourceIds={allocatedIds}
              onAdd={handleAdd}
              testId="training-allocation-add-dressing-room"
            />
          </div>

          {hasOtherResources ? (
            <details className="group rounded-lg border border-[var(--border)] px-3 py-2">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-[var(--text-2)]">
                <ChevronDown
                  size={14}
                  className="text-[var(--muted)] transition-transform group-open:rotate-180"
                  aria-hidden
                />
                {TRAINING_ALLOCATION_GROUP_LABELS.OTHER}
              </summary>
              <div className="mt-3">
                <FacilityResourceSelector
                  facilityGroups={facilityGroupsByGroup.OTHER}
                  allocatedResourceIds={allocatedIds}
                  onAdd={handleAdd}
                  testId="training-allocation-add-other"
                />
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
