"use client";

import Link from "next/link";
import { Archive, CalendarDays, Layers, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import TrainingSeriesArchiveButton from "./TrainingSeriesArchiveButton";
import TrainingSeriesDeleteControl from "./TrainingSeriesDeleteControl";
import { buildTrainingSeriesEditHref } from "@/lib/training/series-cockpit";
import { cn } from "@/lib/cn";

type Props = {
  seriesId: string;
  seriesTitle: string;
  wochenplanerHref: string;
  resourcesHref: string;
  canManage: boolean;
  canDelete: boolean;
  editable: boolean;
};

function MenuItem({
  icon,
  label,
  href,
  onSelect,
  destructive = false,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
  onSelect?: () => void;
  destructive?: boolean;
}) {
  const className = cn(
    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[0.8125rem] text-[var(--text-2)] transition-colors",
    "hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
    destructive && "hover:text-[var(--sce-danger)]",
  );

  if (href) {
    return (
      <Link href={href} role="menuitem" className={className} onClick={onSelect}>
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center opacity-80" aria-hidden="true">
          {icon}
        </span>
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button type="button" role="menuitem" className={className} onClick={onSelect}>
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center opacity-80" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

export default function TrainingSeriesRowContextMenu({
  seriesId,
  seriesTitle,
  wochenplanerHref,
  resourcesHref,
  canManage,
  canDelete,
  editable,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    globalThis.document.addEventListener("mousedown", handlePointerDown);
    globalThis.document.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.document.removeEventListener("mousedown", handlePointerDown);
      globalThis.document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        aria-label="Trainingsaktionen"
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid={`training-series-menu-${seriesId}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[var(--text-2)]",
          "transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
        )}
      >
        <span aria-hidden="true" className="text-base leading-none tracking-widest">
          ···
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={`Aktionen für ${seriesTitle}`}
          className="absolute right-0 top-full z-40 mt-1 w-[240px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
          onClick={(event) => event.stopPropagation()}
        >
          {canManage ? (
            <>
              <MenuItem
                icon={<Pencil className="h-4 w-4" />}
                label="Serie bearbeiten"
                href={buildTrainingSeriesEditHref(seriesId)}
                onSelect={() => setOpen(false)}
              />
              <MenuItem
                icon={<Layers className="h-4 w-4" />}
                label="Ressourcen verwalten"
                href={resourcesHref}
                onSelect={() => setOpen(false)}
              />
            </>
          ) : null}
          <MenuItem
            icon={<CalendarDays className="h-4 w-4" />}
            label="Im Wochenplaner anzeigen"
            href={wochenplanerHref}
            onSelect={() => setOpen(false)}
          />

          {editable ? (
            <>
              <div className="my-1.5 border-t border-[var(--border)]" role="separator" />
              <div className="px-0.5">
                <TrainingSeriesArchiveButton
                  seriesId={seriesId}
                  seriesTitle={seriesTitle}
                  variant="menu"
                  onComplete={() => setOpen(false)}
                />
              </div>
            </>
          ) : null}

          {canDelete && editable ? (
            <div className="px-0.5 pt-0.5">
              <TrainingSeriesDeleteControl
                seriesId={seriesId}
                seriesTitle={seriesTitle}
                canDelete={canDelete}
                variant="menu"
                onOpen={() => setOpen(false)}
              />
            </div>
          ) : null}

          {!canManage && !editable ? (
            <p className="px-2 py-1 text-xs text-[var(--muted)]">Keine weiteren Aktionen verfügbar.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
