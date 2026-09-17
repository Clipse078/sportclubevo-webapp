"use client";

import Link from "next/link";
import {
  Archive,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import TrainingSeriesArchiveButton from "./TrainingSeriesArchiveButton";
import TrainingSeriesDeleteControl from "./TrainingSeriesDeleteControl";
import { SoccerPitchLineIcon } from "@/components/admin/shared/planning/FacilityResourceIdentity";
import { PopoverContent } from "@/components/ui/Popover";
import { buildTrainingSeriesEditHref } from "@/lib/training/series-cockpit";
import type { TrainingSeriesManagementSeriesEntry } from "@/lib/training/management-series-view";
import { cn } from "@/lib/cn";

type Props = {
  teamSeasonId: string;
  teamLabel: string;
  wochenplanerHref: string;
  seriesEntries: TrainingSeriesManagementSeriesEntry[];
  canManage: boolean;
  canDelete: boolean;
};

type ChooserPanel = "edit" | "resources" | "archive" | "delete" | null;

function MenuDivider() {
  return <div className="my-1.5 h-px bg-[var(--border)]/80" role="separator" />;
}

function MenuItem({
  icon,
  iconClassName,
  label,
  href,
  onSelect,
  destructive = false,
  showChevron = false,
  muted = false,
}: {
  icon: ReactNode;
  iconClassName?: string;
  label: string;
  href?: string;
  onSelect?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  muted?: boolean;
}) {
  const className = cn(
    "flex w-full min-h-[40px] items-center gap-3 rounded-[0.625rem] px-3 py-2 text-left text-[0.8125rem] font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-0",
    destructive
      ? "text-[var(--sce-danger)] hover:bg-red-500/10 hover:text-[var(--sce-danger)]"
      : muted
        ? "text-[var(--text-2)] hover:bg-[var(--surface-2)]/90 hover:text-[var(--foreground)]"
        : "text-[var(--foreground)] hover:bg-[var(--surface-2)]/90",
  );

  const content = (
    <>
      <span
        className={cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center",
          iconClassName,
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {showChevron ? <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" /> : null}
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

function ChooserBackButton({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button
      type="button"
      className="mb-1 flex w-full items-center gap-2 rounded-[0.625rem] px-2 py-1.5 text-left text-[0.75rem] font-semibold text-[var(--text-2)] transition-colors hover:bg-[var(--surface-2)]/80 hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
      onClick={onBack}
    >
      <ChevronLeft className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function TrainingSeriesRowContextMenu({
  teamSeasonId,
  teamLabel,
  wochenplanerHref,
  seriesEntries,
  canManage,
  canDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [chooserPanel, setChooserPanel] = useState<ChooserPanel>(null);
  const [archiveEntry, setArchiveEntry] = useState<TrainingSeriesManagementSeriesEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<TrainingSeriesManagementSeriesEntry | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const editableEntries = seriesEntries.filter((entry) => entry.status !== "ARCHIVED");
  const multiSeries = seriesEntries.length > 1;

  function closeMenu() {
    setOpen(false);
  }

  useEffect(() => {
    if (open) return;
    setChooserPanel(null);
    setArchiveEntry(null);
    setDeleteEntry(null);
  }, [open]);

  function renderRootMenu() {
    return (
      <>
        {canManage ? (
          <>
            {multiSeries ? (
              <>
                <MenuItem
                  icon={<Pencil className="h-4 w-4" />}
                  iconClassName="text-[var(--blue-mid)]"
                  label="Serie bearbeiten"
                  showChevron
                  onSelect={() => setChooserPanel("edit")}
                />
                <MenuItem
                  icon={<SoccerPitchLineIcon className="h-[14px] w-[18px]" />}
                  iconClassName="text-emerald-400"
                  label="Ressourcen verwalten"
                  showChevron
                  onSelect={() => setChooserPanel("resources")}
                />
              </>
            ) : (
              <>
                <MenuItem
                  icon={<Pencil className="h-4 w-4" />}
                  iconClassName="text-[var(--blue-mid)]"
                  label="Serie bearbeiten"
                  href={buildTrainingSeriesEditHref(seriesEntries[0]!.seriesId)}
                  onSelect={closeMenu}
                />
                <MenuItem
                  icon={<SoccerPitchLineIcon className="h-[14px] w-[18px]" />}
                  iconClassName="text-emerald-400"
                  label="Ressourcen verwalten"
                  href={`${buildTrainingSeriesEditHref(seriesEntries[0]!.seriesId)}#training-series-ressourcen`}
                  onSelect={closeMenu}
                />
              </>
            )}
          </>
        ) : null}

        <MenuItem
          icon={<CalendarDays className="h-4 w-4" />}
          iconClassName="text-violet-400"
          label="Im Wochenplaner anzeigen"
          href={wochenplanerHref}
          onSelect={closeMenu}
        />

        {canManage && editableEntries.length > 0 ? (
          <>
            <MenuDivider />
            {multiSeries ? (
              <MenuItem
                icon={<Archive className="h-4 w-4" />}
                iconClassName="text-[var(--muted)]"
                label="Archivieren"
                muted
                showChevron
                onSelect={() => setChooserPanel("archive")}
              />
            ) : (
              <TrainingSeriesArchiveButton
                seriesId={editableEntries[0]!.seriesId}
                seriesTitle={editableEntries[0]!.title}
                variant="menu"
                onComplete={closeMenu}
              />
            )}
          </>
        ) : null}

        {canDelete && editableEntries.length > 0 ? (
          <>
            <MenuDivider />
            {multiSeries ? (
              <MenuItem
                icon={<Trash2 className="h-4 w-4" />}
                iconClassName="text-[var(--sce-danger)]"
                label="Löschen"
                destructive
                showChevron
                onSelect={() => setChooserPanel("delete")}
              />
            ) : (
              <TrainingSeriesDeleteControl
                seriesId={editableEntries[0]!.seriesId}
                seriesTitle={editableEntries[0]!.title}
                canDelete={canDelete}
                variant="menu"
                onOpen={closeMenu}
              />
            )}
          </>
        ) : null}

        {!canManage && editableEntries.length === 0 ? (
          <p className="px-3 py-2 text-xs text-[var(--muted)]">Keine weiteren Aktionen verfügbar.</p>
        ) : null}
      </>
    );
  }

  function renderChooserPanel(panel: Exclude<ChooserPanel, null>) {
    const titles: Record<Exclude<ChooserPanel, null>, string> = {
      edit: "Serie bearbeiten",
      resources: "Ressourcen verwalten",
      archive: "Archivieren",
      delete: "Löschen",
    };

    const buildHref =
      panel === "resources"
        ? (seriesId: string) => `${buildTrainingSeriesEditHref(seriesId)}#training-series-ressourcen`
        : buildTrainingSeriesEditHref;

    const entries =
      panel === "archive" || panel === "delete"
        ? editableEntries
        : seriesEntries;

    return (
      <>
        <ChooserBackButton label={titles[panel]} onBack={() => setChooserPanel(null)} />
        <div className="space-y-0.5" role="group" aria-label={`${titles[panel]} — Serie wählen`}>
          {entries.map((entry) => {
            if (panel === "archive") {
              return (
                <MenuItem
                  key={entry.seriesId}
                  icon={<Archive className="h-4 w-4" />}
                  iconClassName="text-[var(--muted)]"
                  label={entry.actionLabel}
                  muted
                  onSelect={() => {
                    setArchiveEntry(entry);
                    setChooserPanel(null);
                  }}
                />
              );
            }

            if (panel === "delete") {
              return (
                <MenuItem
                  key={entry.seriesId}
                  icon={<Trash2 className="h-4 w-4" />}
                  iconClassName="text-[var(--sce-danger)]"
                  label={entry.actionLabel}
                  destructive
                  onSelect={() => {
                    setDeleteEntry(entry);
                    setChooserPanel(null);
                  }}
                />
              );
            }

            return (
              <MenuItem
                key={entry.seriesId}
                icon={
                  panel === "resources" ? (
                    <SoccerPitchLineIcon className="h-[14px] w-[18px]" />
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )
                }
                iconClassName={panel === "resources" ? "text-emerald-400" : "text-[var(--blue-mid)]"}
                label={entry.actionLabel}
                href={buildHref(entry.seriesId)}
                onSelect={closeMenu}
              />
            );
          })}
        </div>
      </>
    );
  }

  function renderPanelBody() {
    if (archiveEntry) {
      return (
        <>
          <ChooserBackButton
            label="Archivieren"
            onBack={() => {
              setArchiveEntry(null);
              setChooserPanel("archive");
            }}
          />
          <TrainingSeriesArchiveButton
            seriesId={archiveEntry.seriesId}
            seriesTitle={`${archiveEntry.title} (${archiveEntry.actionLabel})`}
            variant="menu"
            startConfirming
            onComplete={closeMenu}
          />
        </>
      );
    }

    if (deleteEntry) {
      return (
        <TrainingSeriesDeleteControl
          key={deleteEntry.seriesId}
          seriesId={deleteEntry.seriesId}
          seriesTitle={`${deleteEntry.title} (${deleteEntry.actionLabel})`}
          canDelete={canDelete}
          variant="menu"
          autoOpen
          onOpen={closeMenu}
        />
      );
    }

    if (chooserPanel) {
      return renderChooserPanel(chooserPanel);
    }

    return renderRootMenu();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Trainingsaktionen für ${teamLabel}`}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid={`training-team-menu-${teamSeasonId}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)]/80 bg-transparent text-[var(--text-2)]",
          "transition-[background-color,box-shadow,border-color,color] hover:border-[var(--border)] hover:bg-[var(--surface-2)]/70 hover:text-[var(--foreground)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
          open && "border-[var(--border)] bg-[var(--surface-2)]/90 text-[var(--foreground)]",
        )}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>

      <PopoverContent
        open={open}
        onOpenChange={setOpen}
        anchorRef={triggerRef}
        placement="bottom-end"
        matchAnchorWidth={false}
        clipOverflow={false}
        maxHeight={480}
        role="dialog"
        className="w-[232px] rounded-[0.6875rem] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.42)]"
      >
        <div role="menu" aria-label={`Aktionen für ${teamLabel}`} onClick={(event) => event.stopPropagation()}>
          {renderPanelBody()}
        </div>
      </PopoverContent>
    </>
  );
}
