"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Filter, LayoutGrid, Search, SlidersHorizontal, X } from "lucide-react";
import { PopoverContent } from "@/components/ui/Popover";
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

/** Viewport-safe filter panel width (~420px max). Exported for regression tests. */
export const TOURNAMENT_FILTER_PANEL_WIDTH_CLASS =
  "w-[min(26.25rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)]";

const FILTER_POPOVER_PANEL_CLASS = cn(
  TOURNAMENT_FILTER_PANEL_WIDTH_CLASS,
  "!overflow-y-auto !p-3 !py-3 max-h-[min(80vh,36rem)]",
);

const FILTER_CHIP_CLASS =
  "shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold transition";

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
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const viewTriggerRef = useRef<HTMLButtonElement>(null);
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <button
          ref={filterTriggerRef}
          type="button"
          onClick={() => setOpenPopover((v) => (v === "filter" ? null : "filter"))}
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

        <PopoverContent
          open={openPopover === "filter"}
          onOpenChange={(open) => {
            if (!open) setOpenPopover(null);
          }}
          anchorRef={filterTriggerRef}
          role="dialog"
          matchAnchorWidth={false}
          maxHeight={576}
          clipOverflow={false}
          className={FILTER_POPOVER_PANEL_CLASS}
        >
          <div className="space-y-4" data-testid="tournamentcenter-filter-panel" aria-label="Turnierfilter">
              <div className="min-w-0 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Team</p>
                <div className="relative min-w-0 w-full">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    placeholder="Team suchen…"
                    className="fca-input fca-search-input h-8 w-full min-w-0 text-xs"
                    data-testid="tournamentcenter-filter-team-search"
                  />
                </div>
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
                <div className="flex flex-wrap gap-1.5" data-testid="tournamentcenter-filter-month-chips">
                  <button
                    type="button"
                    onClick={() => navigate(buildHref({ month: null }))}
                    className={cn(
                      FILTER_CHIP_CLASS,
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
                      FILTER_CHIP_CLASS,
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
                <div className="flex flex-wrap gap-1.5" data-testid="tournamentcenter-filter-status-chips">
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
                          FILTER_CHIP_CLASS,
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
                  <div
                    className="flex flex-wrap gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1"
                    role="group"
                    data-testid="tournamentcenter-filter-readiness-chips"
                  >
                    {READINESS_FILTERS.map((item) => {
                      const isActive = item.key === actionFilter;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => navigate(buildHref({ actionFilter: item.key }))}
                          data-testid={`tournamentcenter-filter-${item.key.toLowerCase()}`}
                          className={cn(
                            "shrink-0 whitespace-nowrap rounded-md px-3 py-1 text-[0.68rem] font-semibold transition",
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
        </PopoverContent>
      </div>

      <div className="relative">
        <button
          ref={viewTriggerRef}
          type="button"
          onClick={() => setOpenPopover((v) => (v === "view" ? null : "view"))}
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

        <PopoverContent
          open={openPopover === "view"}
          onOpenChange={(open) => {
            if (!open) setOpenPopover(null);
          }}
          anchorRef={viewTriggerRef}
          role="dialog"
          matchAnchorWidth={false}
          maxHeight={480}
          clipOverflow={false}
          className="!overflow-y-auto !p-3 !py-3 w-56 max-w-[calc(100vw-2rem)]"
        >
          <div className="space-y-4" data-testid="tournamentcenter-view-panel" aria-label="Ansicht und Sortierung">
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
        </PopoverContent>
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
