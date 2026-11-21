"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { TaskStatus } from "@prisma/client";
import {
  allowedVereinsentwicklungStatusTransitions,
  vereinsentwicklungTaskStatusLabel,
} from "@/lib/club-development/vereinsentwicklung-task-status";
import VereinsentwicklungWorkspaceTaskStatusPill from "./VereinsentwicklungWorkspaceTaskStatusPill";
import { cn } from "@/lib/cn";

export type VereinsentwicklungTaskStatusControlProps = {
  taskId: string;
  status: TaskStatus;
  canEdit: boolean;
  disabled?: boolean;
  /** Defaults to `/api/club-development/tasks/{taskId}/status`. */
  patchUrl?: string;
  onUpdated?: (status: TaskStatus) => void;
  onError?: (message: string) => void;
  className?: string;
  /** Visible label for the status field (defaults to «Status»). */
  fieldLabel?: string;
};

export default function VereinsentwicklungTaskStatusControl({
  taskId,
  status,
  canEdit,
  disabled = false,
  patchUrl,
  onUpdated,
  onError,
  className,
  fieldLabel = "Status",
}: VereinsentwicklungTaskStatusControlProps) {
  const selectId = useId();
  const [displayStatus, setDisplayStatus] = useState(status);
  const [busy, setBusy] = useState(false);
  const committedStatus = useRef(status);

  useEffect(() => {
    committedStatus.current = status;
    setDisplayStatus(status);
  }, [status]);

  if (!canEdit) {
    return (
      <VereinsentwicklungWorkspaceTaskStatusPill
        status={displayStatus}
        label={vereinsentwicklungTaskStatusLabel(displayStatus)}
      />
    );
  }

  const options = allowedVereinsentwicklungStatusTransitions(displayStatus);
  const url = patchUrl ?? `/api/club-development/tasks/${encodeURIComponent(taskId)}/status`;

  return (
    <div className={cn("relative inline-flex min-w-0 max-w-full", className)}>
      <label htmlFor={selectId} className="sr-only">
        {fieldLabel}
      </label>
      <select
        id={selectId}
        value={displayStatus}
        disabled={disabled || busy}
        aria-busy={busy}
        data-testid={`vereinsentwicklung-task-status-select-${taskId}`}
        className={cn(
          "max-w-full cursor-pointer appearance-none rounded-full border border-[var(--border)] bg-[var(--surface)] py-0.5 pl-2 pr-7 text-xs font-medium text-[var(--text-2)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sce-primary)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
        onChange={async (event) => {
          const nextStatus = event.target.value as TaskStatus;
          if (nextStatus === committedStatus.current) return;
          const previousStatus = committedStatus.current;
          setDisplayStatus(nextStatus);
          setBusy(true);
          try {
            const res = await fetch(url, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: nextStatus, currentStatus: previousStatus }),
            });
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) {
              setDisplayStatus(previousStatus);
              onError?.(
                typeof data.error === "string" ? data.error : "Status konnte nicht geändert werden.",
              );
              return;
            }
            committedStatus.current = nextStatus;
            onUpdated?.(nextStatus);
          } catch {
            setDisplayStatus(previousStatus);
            onError?.("Status konnte nicht geändert werden.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {vereinsentwicklungTaskStatusLabel(option)}
          </option>
        ))}
      </select>
    </div>
  );
}