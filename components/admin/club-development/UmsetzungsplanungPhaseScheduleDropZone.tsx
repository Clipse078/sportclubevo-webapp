"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import {
  parseUmsetzungsplanungDragPayload,
  UMSETZUNGSPLANUNG_DND_MIME,
} from "@/lib/club-development/umsetzungsplanung-dnd";
import { cn } from "@/lib/cn";
import { useUmsetzungsplanungDragOptional } from "./UmsetzungsplanungDragContext";

type Props = {
  phaseId: string;
  phaseTitle: string;
  acceptDrop: boolean;
  onAssignTask: (taskId: string) => Promise<void>;
  onExpandPhase?: () => void;
  children: ReactNode;
};

export default function UmsetzungsplanungPhaseScheduleDropZone({
  phaseId,
  phaseTitle,
  acceptDrop,
  onAssignTask,
  onExpandPhase,
  children,
}: Props) {
  const dragCtx = useUmsetzungsplanungDragOptional();
  const [dropActive, setDropActive] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dragVisible =
    acceptDrop && dragCtx?.canManagePlanning && dragCtx.dragging?.source === "unplanned";

  const clearDwell = useCallback(() => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
  }, []);

  const handleDragOver = (event: React.DragEvent) => {
    if (!dragVisible) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDropActive(true);
    dragCtx?.setActiveDropPhaseId(phaseId);
    if (onExpandPhase && !dwellTimerRef.current) {
      dwellTimerRef.current = setTimeout(() => {
        dwellTimerRef.current = null;
        onExpandPhase();
      }, 450);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setDropActive(false);
    clearDwell();
    if (dragCtx?.activeDropPhaseId === phaseId) {
      dragCtx.setActiveDropPhaseId(null);
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDropActive(false);
    clearDwell();
    dragCtx?.setActiveDropPhaseId(null);
    setAssignError(null);
    if (!acceptDrop) return;
    const raw =
      event.dataTransfer.getData(UMSETZUNGSPLANUNG_DND_MIME) ||
      event.dataTransfer.getData("text/plain");
    const payload = parseUmsetzungsplanungDragPayload(raw);
    if (!payload || payload.source !== "unplanned") return;
    dragCtx?.notifyOptimisticUnplannedRemove(payload.taskId);
    dragCtx?.endDrag();
    try {
      await onAssignTask(payload.taskId);
    } catch (err) {
      dragCtx?.notifyRollbackUnplannedRestore(payload.taskId);
      setAssignError(err instanceof Error ? err.message : "Einplanen fehlgeschlagen.");
    }
  };

  const showAnchor = dropActive && dragVisible;

  return (
    <div
      className={cn(
        "relative rounded-lg transition-shadow",
        showAnchor && "ring-2 ring-[var(--sce-primary)] ring-offset-2 ring-offset-[var(--surface)]",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => void handleDrop(e)}
      data-testid={`umsetzungsplanung-phase-drop-${phaseId}`}
    >
      {children}
      {showAnchor ? (
        <p
          className="sticky bottom-0 z-10 mt-2 rounded-md border border-dashed border-[var(--sce-primary)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--sce-primary)] shadow-sm"
          data-testid={`umsetzungsplanung-phase-drop-anchor-${phaseId}`}
        >
          {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.phaseDropAnchorLabel}
          <span className="sr-only"> — {phaseTitle}</span>
        </p>
      ) : null}
      {dragVisible && !showAnchor ? (
        <p
          className="mt-2 rounded-md border border-dashed border-[var(--sce-primary)]/50 bg-[var(--surface-2)]/60 px-3 py-2 text-xs text-[var(--text-2)]"
          data-testid={`umsetzungsplanung-phase-drop-hint-${phaseId}`}
        >
          {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.phaseDropHintPrefix} „{phaseTitle}" einzuplanen.
        </p>
      ) : null}
      {assignError ? (
        <p className="mt-2 text-xs text-[var(--destructive)]" role="alert">
          {assignError}
        </p>
      ) : null}
    </div>
  );
}