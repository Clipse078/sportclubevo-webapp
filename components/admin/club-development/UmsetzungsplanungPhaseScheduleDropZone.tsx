"use client";

import { useState, type ReactNode } from "react";
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
  children: ReactNode;
};

export default function UmsetzungsplanungPhaseScheduleDropZone({
  phaseId,
  phaseTitle,
  acceptDrop,
  onAssignTask,
  children,
}: Props) {
  const dragCtx = useUmsetzungsplanungDragOptional();
  const [dropActive, setDropActive] = useState(false);
  const dragVisible =
    acceptDrop &&
    dragCtx?.canManagePlanning &&
    dragCtx.dragging?.source === "unplanned";

  const handleDragOver = (event: React.DragEvent) => {
    if (!dragVisible) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropActive(true);
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setDropActive(false);
    if (!acceptDrop) return;
    const raw =
      event.dataTransfer.getData(UMSETZUNGSPLANUNG_DND_MIME) ||
      event.dataTransfer.getData("text/plain");
    const payload = parseUmsetzungsplanungDragPayload(raw);
    if (!payload || payload.source !== "unplanned") return;
    dragCtx?.endDrag();
    await onAssignTask(payload.taskId);
  };

  return (
    <div
      className={cn(
        "relative rounded-lg transition-shadow",
        dropActive && dragVisible && "ring-2 ring-[var(--sce-primary)] ring-offset-2 ring-offset-[var(--surface)]",
      )}
      onDragOver={handleDragOver}
      onDragLeave={() => setDropActive(false)}
      onDrop={(e) => void handleDrop(e)}
      data-testid={`umsetzungsplanung-phase-drop-${phaseId}`}
    >
      {children}
      {dragVisible ? (
        <p
          className="mt-2 rounded-md border border-dashed border-[var(--sce-primary)]/50 bg-[var(--surface-2)]/60 px-3 py-2 text-xs text-[var(--text-2)]"
          data-testid={`umsetzungsplanung-phase-drop-hint-${phaseId}`}
        >
          {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.phaseDropHintPrefix} „{phaseTitle}“ einzuplanen.
        </p>
      ) : null}
    </div>
  );
}