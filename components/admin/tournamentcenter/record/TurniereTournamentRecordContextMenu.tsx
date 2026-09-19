"use client";

import Link from "next/link";
import { Ban, CalendarDays, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PopoverContent } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";

type Props = {
  wochenplanerHref: string;
  canManageLifecycle: boolean;
  isCancelled: boolean;
  lifecycleLoading: boolean;
  onLifecycleToggle: () => void;
  canDelete: boolean;
  onDeleteRequest?: () => void;
};

export default function TurniereTournamentRecordContextMenu({
  wochenplanerHref,
  canManageLifecycle,
  isCancelled,
  lifecycleLoading,
  onLifecycleToggle,
  canDelete,
  onDeleteRequest,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Weitere Aktionen"
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="turniere-record-context-menu-trigger"
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
        className="w-[240px] rounded-[0.6875rem] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.42)]"
      >
        <div role="menu" aria-label="Turnier Aktionen">
          <Link
            href={wochenplanerHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full min-h-[40px] items-center gap-3 rounded-[0.625rem] px-3 py-2 text-left text-[0.8125rem] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)]/90"
            data-testid="turniere-record-menu-wochenplaner"
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-sky-400" aria-hidden />
            Im Wochenplaner anzeigen
          </Link>

          {canManageLifecycle ? (
            <button
              type="button"
              role="menuitem"
              disabled={lifecycleLoading}
              onClick={() => {
                setOpen(false);
                onLifecycleToggle();
              }}
              className="flex w-full min-h-[40px] items-center gap-3 rounded-[0.625rem] px-3 py-2 text-left text-[0.8125rem] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)]/90 disabled:opacity-50"
              data-testid="turniere-record-menu-lifecycle"
            >
              {isCancelled ? (
                <RotateCcw className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              ) : (
                <Ban className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
              )}
              {isCancelled ? "Turnier wiederherstellen" : "Turnier absagen"}
            </button>
          ) : null}

          {canDelete && onDeleteRequest ? (
            <>
              <div className="my-1 border-t border-[var(--border)]/80" role="separator" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onDeleteRequest();
                }}
                className="flex w-full min-h-[40px] items-center gap-3 rounded-[0.625rem] px-3 py-2 text-left text-[0.8125rem] font-medium text-[var(--sce-danger)] transition-colors hover:bg-[var(--surface-2)]/90"
                data-testid="turniere-record-menu-delete"
              >
                <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                Löschen
              </button>
            </>
          ) : null}
        </div>
      </PopoverContent>
    </>
  );
}
