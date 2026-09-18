"use client";

import Link from "next/link";
import { CalendarDays, Layers, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PopoverContent } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";

type Props = {
  seriesEditHref: string;
  wochenplanerHref: string;
};

export default function TrainingSessionRecordContextMenu({ seriesEditHref, wochenplanerHref }: Props) {
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
        data-testid="training-session-record-context-menu-trigger"
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
        <nav className="flex flex-col gap-0.5" aria-label="Trainingseinzeltermin Aktionen">
          <Link
            href={seriesEditHref}
            className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            onClick={() => setOpen(false)}
          >
            <Layers className="h-4 w-4 text-[var(--muted)]" aria-hidden />
            Zur Serie
          </Link>
          <Link
            href={wochenplanerHref}
            className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            onClick={() => setOpen(false)}
          >
            <CalendarDays className="h-4 w-4 text-[var(--muted)]" aria-hidden />
            Im Wochenplaner
          </Link>
        </nav>
      </PopoverContent>
    </>
  );
}
