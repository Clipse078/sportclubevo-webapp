"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil } from "lucide-react";
import TrainingSessionCancelButton from "./TrainingSessionCancelButton";

type Props = {
  sessionId: string;
  seriesId: string;
  canManage: boolean;
  isCancelled: boolean;
};

export default function TrainingSessionRowMenu({ sessionId, seriesId, canManage, isCancelled }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (!canManage) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label="Aktionen"
        aria-expanded={open}
        aria-haspopup="menu"
        data-testid="training-session-row-menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[var(--muted)] transition hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[12rem] rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
        >
          {!isCancelled ? (
            <>
              <Link
                role="menuitem"
                href={`/dashboard/training/sessions/${sessionId}/edit`}
                data-testid="training-session-edit-link"
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                onClick={() => setOpen(false)}
              >
                <Pencil className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden />
                Training bearbeiten
              </Link>
              <Link
                role="menuitem"
                href={`/dashboard/training/series/${seriesId}/allocations`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                onClick={() => setOpen(false)}
              >
                Ressourcen bearbeiten
              </Link>
              <div role="none" className="my-1 border-t border-[var(--border)]" />
              <div className="px-2 py-1">
                <TrainingSessionCancelButton sessionId={sessionId} isCancelled={isCancelled} variant="menu" />
              </div>
            </>
          ) : (
            <div className="px-2 py-1">
              <TrainingSessionCancelButton sessionId={sessionId} isCancelled={isCancelled} variant="menu" />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
