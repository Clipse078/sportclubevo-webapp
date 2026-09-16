"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type FocusEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Filter, LayoutGrid, SlidersHorizontal, X } from "lucide-react";
import type { TournamentStatus } from "@/lib/tournaments/types";
import type { TournamentActionFilter } from "@/lib/tournaments/view-model";
import type { TournamentGroupMode, TournamentSortMode, TournamentTimeScope } from "@/lib/tournaments/workspace-view-model";
import type { TournamentTeamOption } from "@/lib/tournaments/navigation";
import { formatMonthLabel, resolveMatchcenterMonthWindow } from "@/lib/matchcenter/month-range";
import { cn } from "@/lib/cn";

const STATUS_OPTIONS: { value: TournamentStatus | ""; label: string }[] = [
  { value: "", label: "Alle Status" },
  { value: "DRAFT", label: "Entwurf" },
  { value: "SCHEDULED", label: "Geplant" },
  { value: "LIVE", label: "Live" },
  { value: "COMPLETED", label: "Abgeschlossen" },
  { value: "CANCELLED", label: "Storniert" },
  { value: "POSTPONED", label: "Verschoben" },
  { value: "ARCHIVED", label: "Archiviert" },
];

const GROUP_OPTIONS: { key: TournamentGroupMode; label: string }[] = [
  { key: "DATE", label: "Datum" },
  { key: "MONTH", label: "Monat" },
  { key: "TEAM", label: "Team" },
  { key: "NONE", label: "Keine Gruppierung" },
];

const SORT_OPTIONS: { key: TournamentSortMode; label: string }[] = [
  { key: "DATE_ASC", label: "Datum aufsteigend" },
  { key: "DATE_DESC", label: "Datum absteigend" },
  { key: "TITLE", label: "Turniername" },
];

const READINESS_FILTERS: { key: TournamentActionFilter; label: string }[] = [
  { key: "ALLE", label: "Alle" },
  { key: "OFFEN", label: "Offen" },
  { key: "ERLEDIGT", label: "Erledigt" },
];

type PopoverKind = "filter" | "view" | null;

type BuildHrefFn = (overrides: Record<string, unknown>) => string;

type TournamentCenterFilterSurfaceProps = {
  scope: TournamentTimeScope;
  teamFilter: string | null;
  monthParam: string | null;
  statusFilter: TournamentStatus | null;
  actionFilter: TournamentActionFilter;
  group: TournamentGroupMode;
  sort: TournamentSortMode;
  teamOptions: TournamentTeamOption[];
  buildHref: BuildHrefFn;
  timezone: string;
  locale: string;
  filtersActive: boolean;
};

function usePopoverBlur(containerRef: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  return (event: FocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && containerRef.current?.contains(nextTarget)) return;
    window.setTimeout(onClose, 150);
  };
}

export function TournamentCenterFilterSurface({
  scope,
  teamFilter,
  monthParam,
  statusFilter,
  actionFilter,
  group,
  sort,
  teamOptions,
  buildHref,
  timezone,
  locale,
  filtersActive,
}: TournamentCenterFilterSurfaceProps) {
  const router = useRouter();
  const filterRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const [openPopover, setOpenPopover] = useState<PopoverKind>(null);
  const [teamSearch, setTeamSearch] = useState("");

  const currentMonthWindow = resolveMatchcenterMonthWindow({ timeZone: timezone });

  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return teamOptions;
    return teamOptions.filter((t) => t.label.toLowerCase().includes(q));
  }, [teamOptions, teamSearch]);

  const groupLabel = GROUP_OPTIONS.find((o) => o.key === group)?.label ?? "Datum";
  const sortLabel = SORT_OPTIONS.find((o) => o.key === sort)?.label ?? "Datum aufsteigend";

  function navigate(href: string) {
    setOpenPopover(null);
    setTeamSearch("");
    router.push(href);
  }

  const filterBlur = usePopoverBlur(filterRef, () => setOpenPopover(null));
  const viewBlur = usePopoverBlur(viewRef, () => setOpenPopover(null));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div ref={filterRef} className="relative">
        <button
          type="button"
          onClick={() => setOpenPopover((v) => (v === "filter" ? null : "filter"))}
          onBlur={filterBlur}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors",
            filtersActive || openPopover === "filter"
              ? "border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
          )}
          aria-expanded={openPopover === "filter"}
          aria-haspopup="dialog"
          data-testid="tournamentcenter-filter-trigger"
        >
          <Filter className="h-3.5 w-3.5" aria-hidden />
          Filter
        </button>

        {openPopover === "filter" ? (
          <div
            role="dialog"
            aria-label="Turnierfilter"
            className="absolute left-0 top-full z-50 mt-1.5 w-[min(100vw-2rem,22rem)] rounded-[var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--surface)] p-3 shadow-[var(--shadow-lg)]"
            data-testid="tournamentcenter-filter-panel"
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Team</p>
                <input
                  type="search"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Team suchen…"
                  className="fca-input fca-search-input h-8 text-xs"
                  data-testid="tournamentcenter-filter-team-search"
                />
                <ul className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border)]" role="listbox">
                  <li>
                    <button
                      type="button"
                      role="option"
                      aria-selected={!teamFilter}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => navigate(buildHref({ teamFilter: null }))}
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-[var(--surface-2)]",
                        !teamFilter && "bg-[var(--surface-2)] font-semibold",
                      )}
                      data-testid="tournamentcenter-filter-team-all"
                    >
                      Alle Teams
                      {!teamFilter ? <Check className="h-3.5 w-3.5 text-[var(--sce-primary)]" /> : null}
                    </button>
                  </li>
                  {filteredTeams.map((team) => {
                    const active = teamFilter === team.id;
                    return (
                      <li key={team.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => navigate(buildHref({ teamFilter: team.id }))}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--surface-2)]",
                            active && "bg-[var(--surface-2)] font-semibold",
                          )}
                          data-testid={`tournamentcenter-filter-team-${team.id}`}
                        >
                          <span className="truncate">{team.label}</span>
                          {active ? <Check className="h-3.5 w-3.5 shrink-0 text-[var(--sce-primary)]" /> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Monat / Zeitraum</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigate(buildHref({ month: null }))}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold",
                      !monthParam
                        ? "border-[var(--sce-primary)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                        : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
                    )}
                    data-testid="tournamentcenter-filter-month-all"
                  >
                    Alle Monate
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(buildHref({ month: currentMonthWindow.param }))}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold",
                      monthParam === currentMonthWindow.param
                        ? "border-[var(--sce-primary)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                        : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
                    )}
                    data-testid="tournamentcenter-filter-month-current"
                  >
                    {formatMonthLabel(currentMonthWindow, locale, timezone)}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map((option) => {
                    const active = (statusFilter ?? "") === option.value;
                    return (
                      <button
                        key={option.value || "all"}
                        type="button"
                        onClick={() =>
                          navigate(
                            buildHref({
                              statusFilter: option.value ? option.value : null,
                            }),
                          )
                        }
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold transition",
                          active
                            ? "border-[var(--sce-primary)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                            : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
                        )}
                        data-testid={`tournamentcenter-filter-status-${option.value || "all"}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {scope === "UPCOMING" ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Vorbereitung</p>
                  <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5" role="group">
                    {READINESS_FILTERS.map((item) => {
                      const isActive = item.key === actionFilter;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => navigate(buildHref({ actionFilter: item.key }))}
                          data-testid={`tournamentcenter-filter-${item.key.toLowerCase()}`}
                          className={cn(
                            "rounded-md px-3 py-1 text-[0.68rem] font-semibold transition",
                            isActive
                              ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                              : "text-[var(--text-2)] hover:text-[var(--foreground)]",
                          )}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div ref={viewRef} className="relative">
        <button
          type="button"
          onClick={() => setOpenPopover((v) => (v === "view" ? null : "view"))}
          onBlur={viewBlur}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors",
            openPopover === "view"
              ? "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--foreground)]"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
          )}
          aria-expanded={openPopover === "view"}
          aria-haspopup="dialog"
          data-testid="tournamentcenter-view-trigger"
        >
          <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Ansicht:</span> {groupLabel}
        </button>

        {openPopover === "view" ? (
          <div
            role="dialog"
            aria-label="Ansicht und Sortierung"
            className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-[var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--surface)] p-3 shadow-[var(--shadow-lg)] sm:left-auto"
            data-testid="tournamentcenter-view-panel"
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Gruppierung</p>
                <ul className="space-y-0.5">
                  {GROUP_OPTIONS.map((option) => {
                    const active = group === option.key;
                    return (
                      <li key={option.key}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => navigate(buildHref({ group: option.key }))}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-[var(--surface-2)]",
                            active && "bg-[var(--surface-2)] font-semibold",
                          )}
                          data-testid={`tournamentcenter-group-${option.key.toLowerCase()}`}
                        >
                          {option.label}
                          {active ? <Check className="h-3.5 w-3.5 text-[var(--sce-primary)]" /> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="space-y-1.5 border-t border-[var(--border)] pt-3">
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                  <SlidersHorizontal className="h-3 w-3" aria-hidden />
                  Sortierung
                </p>
                <ul className="space-y-0.5">
                  {SORT_OPTIONS.map((option) => {
                    const active = sort === option.key;
                    return (
                      <li key={option.key}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => navigate(buildHref({ sort: option.key }))}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-[var(--surface-2)]",
                            active && "bg-[var(--surface-2)] font-semibold",
                          )}
                          data-testid={`tournamentcenter-sort-${option.key.toLowerCase()}`}
                        >
                          {option.label}
                          {active ? <Check className="h-3.5 w-3.5 text-[var(--sce-primary)]" /> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[0.65rem] text-[var(--muted)]">Aktuell: {sortLabel}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ActiveFilterChip = {
  key: string;
  label: string;
  href: string;
};

export function TournamentCenterActiveFilterChips({
  chips,
  resetHref,
}: {
  chips: ActiveFilterChip[];
  resetHref: string;
}) {
  if (chips.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="tournamentcenter-active-filters"
    >
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] py-0.5 pl-2.5 pr-1 text-[0.68rem] font-semibold text-[var(--foreground)] hover:border-[var(--border-strong)]"
          data-testid={`tournamentcenter-active-filter-${chip.key}`}
        >
          <span className="truncate">{chip.label}</span>
          <X className="h-3 w-3 shrink-0 text-[var(--muted)]" aria-hidden />
        </Link>
      ))}
      <Link
        href={resetHref}
        className="text-[0.68rem] font-semibold text-[var(--sce-primary)] hover:underline"
        data-testid="tournamentcenter-reset-filters"
      >
        Alle Filter zurücksetzen
      </Link>
    </div>
  );
}
