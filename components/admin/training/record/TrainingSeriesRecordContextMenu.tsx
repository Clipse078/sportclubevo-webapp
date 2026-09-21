"use client";

import { CalendarDays, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import TrainingSeriesArchiveButton from "@/components/admin/training/TrainingSeriesArchiveButton";
import TrainingSeriesDeleteControl from "@/components/admin/training/TrainingSeriesDeleteControl";
import { PopoverContent } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";

type Props = {
  seriesId: string;
  seriesTitle: string;
  wochenplanerHref: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  canManage: boolean;
  canDelete: boolean;
  createTaskAction?: ReactNode;
  onRestored?: () => void;
};

export default function TrainingSeriesRecordContextMenu({
  seriesId,
  seriesTitle,
  wochenplanerHref,
  status,
  canManage,
  canDelete,
  createTaskAction,
  onRestored,
}: Props) {
  const [open, setOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) return;
    setRestoreError(null);
  }, [open]);

  async function handleRestore() {
    setRestoring(true);
    setRestoreError(null);
    try {
      const res = await fetch(`/api/training-series/${seriesId}/restore`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setRestoreError(data.error ?? "Reaktivierung fehlgeschlagen.");
        return;
      }
      setOpen(false);
      onRestored?.();
    } catch {
      setRestoreError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setRestoring(false);
    }
  }

  function closeMenu() {
    setOpen(false);
  }

  const showArchive = canManage && status !== "ARCHIVED";
  const showRestore = canManage && status === "ARCHIVED";
  const showDelete = canDelete && status !== "ARCHIVED";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Weitere Aktionen"
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="training-record-context-menu-trigger"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)]/80 bg-transparent text-[var(--text-2)]",
          "transition hover:border-[var(--border)] hover:bg-[var(--surface-2)]/70 hover:text-[var(--foreground)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
          open && "border-[var(--border)] bg-[var(--surface-2)]/90 text-[var(--foreground)]",
        )}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>

      <PopoverContent
        open={open}
        onOpenChange={setOpen}
        anchorRef={triggerRef}
        placement="bottom-end"
        matchAnchorWidth={false}
        role="dialog"
        className="w-[232px] rounded-[0.6875rem] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.42)]"
      >
        <div role="menu" aria-label="Trainingsserie Aktionen">
          <Link
            href={wochenplanerHref}
            role="menuitem"
            className="flex w-full min-h-[40px] items-center gap-3 rounded-[0.625rem] px-3 py-2 text-left text-[0.8125rem] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)]/90"
            onClick={closeMenu}
            data-testid="training-record-menu-wochenplaner"
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-violet-400" aria-hidden />
            Im Wochenplaner anzeigen
          </Link>

          {createTaskAction ? (
            <div onClick={closeMenu} data-testid="training-record-menu-create-task">
              {createTaskAction}
            </div>
          ) : null}

          {showRestore ? (
            <>
              <div className="my-1.5 h-px bg-[var(--border)]/80" role="separator" />
              <button
                type="button"
                role="menuitem"
                disabled={restoring}
                onClick={() => void handleRestore()}
                className="flex w-full min-h-[40px] items-center gap-3 rounded-[0.625rem] px-3 py-2 text-left text-[0.8125rem] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)]/90 disabled:opacity-60"
                data-testid="training-record-menu-restore"
              >
                <RotateCcw className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
                {restoring ? "Reaktiviert…" : "Reaktivieren"}
              </button>
              {restoreError ? (
                <p className="px-3 py-1 text-[11px] font-medium text-[var(--sce-danger)]">{restoreError}</p>
              ) : null}
            </>
          ) : null}

          {showArchive ? (
            <>
              <div className="my-1.5 h-px bg-[var(--border)]/80" role="separator" />
              <TrainingSeriesArchiveButton
                seriesId={seriesId}
                seriesTitle={seriesTitle}
                variant="menu"
                onComplete={closeMenu}
              />
            </>
          ) : null}

          {showDelete ? (
            <>
              <div className="my-1.5 h-px bg-[var(--border)]/80" role="separator" />
              <TrainingSeriesDeleteControl
                seriesId={seriesId}
                seriesTitle={seriesTitle}
                canDelete={canDelete}
                variant="menu"
                onOpen={closeMenu}
              />
            </>
          ) : null}

          {!canManage && !canDelete ? (
            <p className="px-3 py-2 text-xs text-[var(--muted)]">Keine weiteren Aktionen verfügbar.</p>
          ) : null}
        </div>
      </PopoverContent>
    </>
  );
}
