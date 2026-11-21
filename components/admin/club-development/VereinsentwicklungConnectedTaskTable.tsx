"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical, MoreVertical } from "lucide-react";
import {
  VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS,
  type VereinsentwicklungConnectedTaskTableRowModel,
} from "@/lib/club-development/vereinsentwicklung-connected-task-table";
import {
  computeUnplannedListReorder,
  serializeUmsetzungsplanungDragPayload,
  UMSETZUNGSPLANUNG_DND_MIME,
} from "@/lib/club-development/umsetzungsplanung-dnd";
import VereinsentwicklungWorkspaceTaskStatusPill from "./VereinsentwicklungWorkspaceTaskStatusPill";
import VereinsentwicklungBacklogTruncatingTitle from "./VereinsentwicklungBacklogTruncatingTitle";
import VereinsentwicklungBacklogReferenceCell from "./VereinsentwicklungBacklogReferenceCell";
import VereinsentwicklungBacklogFortschrittHeader from "./VereinsentwicklungBacklogFortschrittHeader";
import SceCompletionProgressInline from "./SceCompletionProgressInline";
import UmsetzungsplanungInsertionLine from "./UmsetzungsplanungInsertionLine";
import {
  SCE_CD_BACKLOG_GRID_TASK,
  SCE_CD_BACKLOG_GRID_TASK_PROGRESS,
  SCE_CD_BACKLOG_ROW_CLASS,
} from "./sce-club-development-surface-styles";
import { CD_STRATEGY_PROGRESS_COPY } from "@/lib/club-development/strategy-progress-copy";
import { cn } from "@/lib/cn";
import { useUmsetzungsplanungTaskRowPointerDrag } from "./useUmsetzungsplanungTaskRowPointerDrag";

export type VereinsentwicklungConnectedTaskTableLayout = "backlog" | "full";

function AssigneeCell({
  assignees,
}: {
  assignees: VereinsentwicklungConnectedTaskTableRowModel["assignees"];
}) {
  if (assignees.length === 0) return <span className="text-xs text-[var(--muted)]">—</span>;
  const primary = assignees[0]!;
  const initials = primary.displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {primary.imageUrl ? (
        <img
          src={primary.imageUrl}
          alt=""
          className="h-6 w-6 shrink-0 rounded-full border border-[var(--border)] object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[0.625rem] font-semibold uppercase text-[var(--sce-primary)]"
        >
          {initials || "?"}
        </span>
      )}
      <span className="truncate text-xs text-[var(--text-2)]">{primary.displayName}</span>
    </div>
  );
}

function LinkCell({
  label,
  href,
  columnLabel,
}: {
  label: string | null;
  href: string | null;
  columnLabel: typeof VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.ziel | typeof VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.strategie;
}) {
  if (!label?.trim()) {
    return <span className="text-xs text-[var(--muted)]">—</span>;
  }
  if (!href) return <span className="text-xs text-[var(--text-2)]">{label}</span>;
  return (
    <Link href={href} className="text-xs text-[var(--text-2)] hover:text-[var(--sce-primary)]">
      <span className="sr-only">{columnLabel}: </span>
      {label}
    </Link>
  );
}

export type VereinsentwicklungTaskTableReorderConfig = {
  /** Allow drag handle for scheduling into phases. */
  dragEnabled: boolean;
  /** Allow in-list rank reorder (insertion line). */
  canReorder: boolean;
  disabledHint?: string | null;
  pending?: boolean;
  allOrderedTaskIds: string[];
  onPersistOrder: (orderedTaskIds: string[]) => Promise<{ ok: boolean; error?: string }>;
  onDragStart?: (taskId: string) => void;
  onDragEnd?: () => void;
};

export type VereinsentwicklungPhaseDragConfig = {
  enabled: boolean;
  phaseId: string;
  onDragStart?: (taskId: string) => void;
  onDragEnd?: () => void;
};

export type VereinsentwicklungConnectedTaskTableProps = {
  rows: VereinsentwicklungConnectedTaskTableRowModel[];
  layoutVariant?: VereinsentwicklungConnectedTaskTableLayout;
  showRowProgress?: boolean;
  showReorderHandle?: boolean;
  reorder?: VereinsentwicklungTaskTableReorderConfig;
  phaseDrag?: VereinsentwicklungPhaseDragConfig;
  renderRowActions?: (row: VereinsentwicklungConnectedTaskTableRowModel) => ReactNode;
  footer?: ReactNode;
  testId?: string;
};

function TaskTableRow({
  row,
  gridCols,
  layoutVariant,
  showRowProgress,
  showReorderHandle,
  dragHandleEnabled,
  reorderPending,
  onDragStartRow,
  onDragEndRow,
  phaseDrag,
  renderRowActions,
  schedulingDragEnabled = false,
}: {
  row: VereinsentwicklungConnectedTaskTableRowModel;
  gridCols: string;
  layoutVariant: VereinsentwicklungConnectedTaskTableLayout;
  showRowProgress: boolean;
  showReorderHandle: boolean;
  dragHandleEnabled: boolean;
  reorderPending?: boolean;
  onDragStartRow?: (taskId: string) => void;
  onDragEndRow?: () => void;
  phaseDrag?: VereinsentwicklungPhaseDragConfig;
  renderRowActions?: (row: VereinsentwicklungConnectedTaskTableRowModel) => ReactNode;
  schedulingDragEnabled?: boolean;
}) {
  const phaseHandle = Boolean(phaseDrag?.enabled);
  const pointerDrag = useUmsetzungsplanungTaskRowPointerDrag();

  const startSchedulingPayload = (event: React.DragEvent) => {
    const payload = serializeUmsetzungsplanungDragPayload(
      phaseHandle
        ? {
            taskId: row.taskId,
            source: "phase",
            sourcePhaseId: phaseDrag!.phaseId,
          }
        : {
            taskId: row.taskId,
            source: "unplanned",
          },
    );
    event.dataTransfer.setData(UMSETZUNGSPLANUNG_DND_MIME, payload);
    event.dataTransfer.setData("text/plain", payload);
    event.dataTransfer.effectAllowed = "move";
    if (phaseHandle) phaseDrag?.onDragStart?.(row.taskId);
    else onDragStartRow?.(row.taskId);
  };

  return (
    <>
      <div
        className={cn(SCE_CD_BACKLOG_ROW_CLASS, "sm:items-center", gridCols)}
        data-testid={`vereinsentwicklung-task-row-${row.taskId}`}
        data-sce-backlog-row="task"
      >
        {showReorderHandle || phaseHandle ? (
          dragHandleEnabled || phaseHandle ? (
            <div
              role="button"
              tabIndex={reorderPending ? -1 : 0}
              aria-label={`${row.title} verschieben`}
              aria-disabled={reorderPending || undefined}
              draggable={!reorderPending}
              onKeyDown={(event) => {
                if (reorderPending) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                }
              }}
              onPointerDown={pointerDrag.onPointerDown}
              onPointerMove={pointerDrag.onPointerMove}
              onPointerUp={pointerDrag.onPointerUp}
              onPointerCancel={pointerDrag.onPointerCancel}
              onDragStart={(event) => {
                if (!pointerDrag.shouldAllowDragStart()) {
                  event.preventDefault();
                  return;
                }
                pointerDrag.onDragStartAfterThreshold();
                startSchedulingPayload(event);
              }}
              onDragEnd={() => {
                pointerDrag.resetPointerGesture();
                if (phaseHandle) phaseDrag?.onDragEnd?.();
                else onDragEndRow?.();
              }}
              className="flex items-center text-[var(--muted)] cursor-grab rounded p-0.5 hover:bg-[var(--surface-2)] active:cursor-grabbing aria-disabled:opacity-50"
              data-testid={
                phaseHandle
                  ? `umsetzungsplanung-phase-drag-${row.taskId}`
                  : `umsetzungsplanung-unplanned-drag-${row.taskId}`
              }
            >
              <GripVertical className="h-4 w-4" aria-hidden />
            </div>
          ) : (
            <span className="flex items-center text-[var(--muted)]" aria-hidden>
              <GripVertical className="h-4 w-4" />
            </span>
          )
        ) : null}
        <VereinsentwicklungBacklogReferenceCell reference={row.publicReference} />
        <div
          className="min-w-0"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <VereinsentwicklungBacklogTruncatingTitle
            title={row.title}
            href={row.taskHref}
            suppressNativeLinkDrag={Boolean(showReorderHandle || phaseHandle)}
            schedulingDrag={
              schedulingDragEnabled
                ? {
                    enabled: true,
                    pending: reorderPending,
                    onDragStart: startSchedulingPayload,
                    onDragEnd: () => {
                      if (phaseHandle) phaseDrag?.onDragEnd?.();
                      else onDragEndRow?.();
                    },
                  }
                : undefined
            }
          />
        </div>
        <LinkCell
          label={row.targetTitle}
          href={row.targetHref}
          columnLabel={VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.ziel}
        />
        {layoutVariant === "full" ? (
          <>
            <LinkCell
              label={row.strategyTitle}
              href={row.strategyHref}
              columnLabel={VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.strategie}
            />
            <span className="text-xs text-[var(--text-2)]">{row.orgUnitLabel?.trim() || "Gesamtverein"}</span>
          </>
        ) : null}
        <VereinsentwicklungWorkspaceTaskStatusPill status={row.status} label={row.statusLabel} />
        <AssigneeCell assignees={row.assignees} />
        {showRowProgress ? (
          row.progressHasChildRollup && (row.progressTotalCount ?? 0) > 0 ? (
            <SceCompletionProgressInline
              metricLabel={CD_STRATEGY_PROGRESS_COPY.taskProgressLabel}
              completedCount={row.progressCompletedCount ?? null}
              totalCount={row.progressTotalCount ?? null}
              countCaption={null}
              emptyLabel="Noch keine Teilaufgaben"
              countSuffix="erledigt"
              unitShortLabel={CD_STRATEGY_PROGRESS_COPY.deliveryUnitShortLabel}
              testId={`task-row-progress-${row.taskId}`}
            />
          ) : (
            <div className="min-w-0 text-xs text-[var(--muted)]" aria-hidden>
              —
            </div>
          )
        ) : null}
        <div className="flex justify-end">
          {renderRowActions ? (
            renderRowActions(row)
          ) : (
            <span className="text-[var(--muted)]" aria-hidden>
              <MoreVertical className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
    </>
  );
}

export default function VereinsentwicklungConnectedTaskTable({
  rows,
  layoutVariant = "backlog",
  showRowProgress = false,
  showReorderHandle = false,
  reorder,
  phaseDrag,
  renderRowActions,
  footer,
  testId,
}: VereinsentwicklungConnectedTaskTableProps) {
  const showHandleColumn = showReorderHandle || Boolean(phaseDrag?.enabled);
  const progressColumnActive =
    showRowProgress &&
  rows.some((row) => row.progressHasChildRollup && (row.progressTotalCount ?? 0) > 0);
  const showProgressColumn = showRowProgress || progressColumnActive;
  const backlogGrid = showProgressColumn ? SCE_CD_BACKLOG_GRID_TASK_PROGRESS : SCE_CD_BACKLOG_GRID_TASK;
  const gridCols =
    layoutVariant === "backlog"
      ? backlogGrid
      : showHandleColumn
        ? "sm:grid-cols-[auto_minmax(0,1.35fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,0.75fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto]"
        : "sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,0.75fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto]";

  const reorderListActive = Boolean(showReorderHandle && reorder?.canReorder);
  const dragHandleEnabled = Boolean(
    showReorderHandle && (reorder?.canReorder || reorder?.dragEnabled),
  );
  const [displayRows, setDisplayRows] = useState(rows);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const snapshotRef = useRef<VereinsentwicklungConnectedTaskTableRowModel[] | null>(null);

  useEffect(() => {
    setDisplayRows(rows);
  }, [rows]);

  const applyReorder = useCallback(
    async (nextDisplay: VereinsentwicklungConnectedTaskTableRowModel[]) => {
      if (!reorder?.canReorder) return;
      snapshotRef.current = displayRows;
      setDisplayRows(nextDisplay);
      const visibleIds = new Set(nextDisplay.map((r) => r.taskId));
      const untouched = reorder.allOrderedTaskIds.filter((id) => !visibleIds.has(id));
      const nextOrder = [...nextDisplay.map((r) => r.taskId), ...untouched];
      const result = await reorder.onPersistOrder(nextOrder);
      if (!result.ok) {
        if (snapshotRef.current) setDisplayRows(snapshotRef.current);
      }
    },
    [displayRows, reorder],
  );

  const handleListDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const currentDraggedId = draggedId;
      const currentDropIndex = dropIndex;
      setDraggedId(null);
      setDropIndex(null);
      reorder?.onDragEnd?.();
      if (!reorderListActive || currentDraggedId === null || currentDropIndex === null) return;

      const next = computeUnplannedListReorder(displayRows, currentDraggedId, currentDropIndex);
      if (next) void applyReorder(next);
    },
    [applyReorder, displayRows, draggedId, dropIndex, reorder, reorderListActive],
  );

  const draggedIdx = draggedId !== null ? displayRows.findIndex((r) => r.taskId === draggedId) : -1;

  const isActiveDropLine = (lineIdx: number) => {
    if (draggedId === null || dropIndex === null || dropIndex !== lineIdx) return false;
    if (draggedIdx >= 0 && (lineIdx === draggedIdx || lineIdx === draggedIdx + 1)) return false;
    return true;
  };

  const onDragStartRow = (taskId: string) => {
    setDraggedId(taskId);
    reorder?.onDragStart?.(taskId);
  };

  const onDragEndRow = () => {
    setDraggedId(null);
    setDropIndex(null);
    reorder?.onDragEnd?.();
  };

  return (
    <div className="space-y-0" data-testid={testId}>
      <div
        className={cn(
          "hidden gap-3 border-b border-[var(--border)]/60 pb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)] sm:grid",
          gridCols,
        )}
        data-testid="vereinsentwicklung-task-table-header"
      >
        {showHandleColumn ? <span className="w-5" /> : null}
        <span>{VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.referenz}</span>
        <span>{VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.aufgabe}</span>
        <span>{VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.ziel}</span>
        {layoutVariant === "full" ? (
          <>
            <span>{VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.strategie}</span>
            <span>{VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.orgEinheit}</span>
          </>
        ) : null}
        <span>{VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.status}</span>
        <span>{VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.verantwortlich}</span>
        {showProgressColumn ? (
          <VereinsentwicklungBacklogFortschrittHeader unitShortLabel={CD_STRATEGY_PROGRESS_COPY.deliveryUnitShortLabel} />
        ) : null}
        <span className="w-8" aria-hidden />
      </div>

      <div
        role="list"
        className="list-none divide-y divide-[var(--border)]/50"
        onDragOver={(e) => {
          if (reorderListActive) e.preventDefault();
        }}
        onDrop={reorderListActive ? handleListDrop : undefined}
        onDragLeave={reorderListActive ? () => setDropIndex(null) : undefined}
      >
        {reorderListActive ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDropIndex(0);
            }}
          >
            <UmsetzungsplanungInsertionLine active={isActiveDropLine(0)} />
          </div>
        ) : null}
        {displayRows.map((row, idx) => (
          <li
            key={row.taskId}
            role="listitem"
            className="list-none"
            onDragOver={
              reorderListActive
                ? (e) => {
                    e.preventDefault();
                    setDropIndex(idx + 1);
                  }
                : undefined
            }
          >
            <TaskTableRow
              row={row}
              gridCols={gridCols}
              layoutVariant={layoutVariant}
              showRowProgress={showProgressColumn}
              showReorderHandle={showReorderHandle}
              dragHandleEnabled={dragHandleEnabled}
              schedulingDragEnabled={dragHandleEnabled || Boolean(phaseDrag?.enabled)}
              reorderPending={reorder?.pending}
              onDragStartRow={onDragStartRow}
              onDragEndRow={onDragEndRow}
              phaseDrag={phaseDrag}
              renderRowActions={renderRowActions}
            />
            {reorderListActive ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropIndex(idx + 1);
                }}
              >
                <UmsetzungsplanungInsertionLine active={isActiveDropLine(idx + 1)} />
              </div>
            ) : null}
          </li>
        ))}
      </div>
      {footer ? <div className="pt-3">{footer}</div> : null}
    </div>
  );
}