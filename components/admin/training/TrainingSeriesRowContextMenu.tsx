"use client";

import Link from "next/link";
import { Archive, CalendarDays, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import TrainingSeriesArchiveButton from "./TrainingSeriesArchiveButton";
import TrainingSeriesDeleteControl from "./TrainingSeriesDeleteControl";
import { SoccerPitchLineIcon } from "@/components/admin/shared/planning/FacilityResourceIdentity";
import { buildTrainingSeriesEditHref } from "@/lib/training/series-cockpit";
import type { TrainingSeriesManagementSeriesEntry } from "@/lib/training/management-series-view";
import { cn } from "@/lib/cn";

type Props = {
  teamLabel: string;
  wochenplanerHref: string;
  seriesEntries: TrainingSeriesManagementSeriesEntry[];
  canManage: boolean;
  canDelete: boolean;
};

function MenuItem({
  icon,
  label,
  href,
  onSelect,
  destructive = false,
  trailing,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
  onSelect?: () => void;
  destructive?: boolean;
  trailing?: ReactNode;
}) {
  const className = cn(
    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[0.8125rem] text-[var(--text-2)] transition-colors",
    "hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
    destructive && "text-[var(--sce-danger)] hover:bg-red-500/10 hover:text-[var(--sce-danger)]",
  );

  const content = (
    <>
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center opacity-90" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </>
  );

  if (href) {
    return (
      <Link href={href} role="menuitem" className={className} onClick={onSelect}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" role="menuitem" className={className} onClick={onSelect}>
      {content}
    </button>
  );
}

function SeriesSubmenu({
  label,
  icon,
  entries,
  buildHref,
  onClose,
}: {
  label: string;
  icon: ReactNode;
  entries: TrainingSeriesManagementSeriesEntry[];
  buildHref: (seriesId: string) => string;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 1) {
    const entry = entries[0]!;
    return (
      <MenuItem icon={icon} label={label} href={buildHref(entry.seriesId)} onSelect={onClose} />
    );
  }

  return (
    <div className="relative">
      <MenuItem
        icon={icon}
        label={label}
        trailing={<ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />}
        onSelect={() => setExpanded((value) => !value)}
      />
      {expanded ? (
        <div
          className="ml-2 mt-0.5 space-y-0.5 border-l border-[var(--border)]/80 pl-2"
          role="group"
          aria-label={`${label} — Serie wählen`}
        >
          {entries.map((entry) => (
            <MenuItem
              key={entry.seriesId}
              icon={<span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)]" />}
              label={entry.actionLabel}
              href={buildHref(entry.seriesId)}
              onSelect={onClose}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function TrainingSeriesRowContextMenu({
  teamLabel,
  wochenplanerHref,
  seriesEntries,
  canManage,
  canDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const primarySeriesId = seriesEntries[0]?.seriesId ?? "unknown";
  const editableEntries = seriesEntries.filter((entry) => entry.status !== "ARCHIVED");

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
        aria-label={`Trainingsaktionen für ${teamLabel}`}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid={`training-series-menu-${primarySeriesId}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/80 text-[var(--text-2)] shadow-sm",
          "transition-[background-color,box-shadow,border-color] hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] hover:shadow",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
        )}
      >
        <span aria-hidden="true" className="text-sm font-semibold leading-none tracking-[0.2em]">
          ···
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={`Aktionen für ${teamLabel}`}
          className="absolute right-0 top-full z-40 mt-1.5 w-[232px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.42)]"
          onClick={(event) => event.stopPropagation()}
        >
          {canManage ? (
            <>
              <SeriesSubmenu
                label="Serie bearbeiten"
                icon={<Pencil className="h-4 w-4" />}
                entries={seriesEntries}
                buildHref={buildTrainingSeriesEditHref}
                onClose={() => setOpen(false)}
              />
              <SeriesSubmenu
                label="Ressourcen verwalten"
                icon={<SoccerPitchLineIcon className="h-[14px] w-[18px]" />}
                entries={seriesEntries}
                buildHref={(seriesId) => `${buildTrainingSeriesEditHref(seriesId)}#training-series-ressourcen`}
                onClose={() => setOpen(false)}
              />
            </>
          ) : null}
          <MenuItem
            icon={<CalendarDays className="h-4 w-4" />}
            label="Im Wochenplaner anzeigen"
            href={wochenplanerHref}
            onSelect={() => setOpen(false)}
          />

          {canManage && editableEntries.length > 0 ? (
            <>
              <div className="my-1.5 border-t border-[var(--border)]" role="separator" />
              {editableEntries.length === 1 ? (
                <div className="px-0.5">
                  <TrainingSeriesArchiveButton
                    seriesId={editableEntries[0]!.seriesId}
                    seriesTitle={editableEntries[0]!.title}
                    variant="menu"
                    onComplete={() => setOpen(false)}
                  />
                </div>
              ) : (
                <div className="px-0.5">
                  <p className="flex items-center gap-2.5 px-2.5 py-1.5 text-[0.8125rem] text-[var(--text-2)]">
                    <Archive className="h-4 w-4 opacity-90" aria-hidden="true" />
                    Archivieren
                  </p>
                  <div className="ml-2 space-y-0.5 border-l border-[var(--border)]/80 pl-2">
                    {editableEntries.map((entry) => (
                      <TrainingSeriesArchiveButton
                        key={entry.seriesId}
                        seriesId={entry.seriesId}
                        seriesTitle={`${entry.title} (${entry.actionLabel})`}
                        variant="menu"
                        onComplete={() => setOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}

          {canDelete && editableEntries.length > 0 ? (
            editableEntries.length === 1 ? (
              <div className="px-0.5 pt-0.5">
                <TrainingSeriesDeleteControl
                  seriesId={editableEntries[0]!.seriesId}
                  seriesTitle={editableEntries[0]!.title}
                  canDelete={canDelete}
                  variant="menu"
                  onOpen={() => setOpen(false)}
                />
              </div>
            ) : (
              <div className="space-y-0.5 px-0.5 pt-0.5">
                <p className="px-2.5 py-1 text-[0.6875rem] font-medium uppercase tracking-wide text-[var(--muted)]">
                  Löschen
                </p>
                {editableEntries.map((entry) => (
                  <div key={entry.seriesId}>
                    <TrainingSeriesDeleteControl
                      seriesId={entry.seriesId}
                      seriesTitle={`${entry.title} (${entry.actionLabel})`}
                      canDelete={canDelete}
                      variant="menu"
                      onOpen={() => setOpen(false)}
                    />
                  </div>
                ))}
              </div>
            )
          ) : null}

          {!canManage && editableEntries.length === 0 ? (
            <p className="px-2 py-1 text-xs text-[var(--muted)]">Keine weiteren Aktionen verfügbar.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
