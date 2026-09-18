"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import type {
  SpieleHomeAwayFilter,
  SpieleStatusMaskKey,
  MatchcenterTeamOption,
} from "@/lib/matchcenter/navigation";
import type {
  MatchcenterActionFilter,
  MatchcenterTab,
  MatchcenterWochenplanFilter,
} from "@/lib/matchcenter/view-model";
import { cn } from "@/lib/cn";

type Props = {
  tab: MatchcenterTab;
  basePath: string;
  month: string;
  actionFilter: MatchcenterActionFilter;
  wochenplanFilter: MatchcenterWochenplanFilter;
  searchValue?: string;
  sortValue?: string | null;
  homeAwayFilter: SpieleHomeAwayFilter;
  listView: import("@/lib/matchcenter/navigation").SpieleListView;
  teamFilter: string | null;
  teamOptions: MatchcenterTeamOption[];
  teamHrefByValue: Record<string, string>;
  competitionFilter: string | null;
  venueFilter: string | null;
  statusMask: readonly SpieleStatusMaskKey[];
  competitionOptions: string[];
  venueOptions: string[];
  statusCounts: Record<SpieleStatusMaskKey, number>;
  alleHref: string;
  heimHref: string;
  auswaertsHref: string;
  statusToggleHrefs: Record<SpieleStatusMaskKey, string>;
  resetHref: string;
  actionFilterHrefs: Record<MatchcenterActionFilter, string>;
  competitionHrefByValue: Record<string, string>;
  venueHrefByValue: Record<string, string>;
};

const STATUS_ITEMS: { key: SpieleStatusMaskKey; label: string }[] = [
  { key: "anstehend", label: "Anstehend" },
  { key: "offen", label: "Offen" },
  { key: "bereit", label: "Bereit" },
  { key: "abgesagt", label: "Abgesagt" },
];

const ACTION_FILTERS: { key: MatchcenterActionFilter; label: string }[] = [
  { key: "ALLE", label: "Alle Status" },
  { key: "OFFEN", label: "Offen" },
  { key: "ERLEDIGT", label: "Bereit" },
];

function navigate(href: string) {
  if (typeof window !== "undefined") {
    window.location.assign(href);
  }
}

export default function SpieleManagementFilterRail(props: Props) {
  const maskSet = new Set(props.statusMask);

  const haItems: { key: SpieleHomeAwayFilter; label: string; href: string }[] = [
    { key: "ALLE", label: "Alle", href: props.alleHref },
    { key: "HOME", label: "Heim", href: props.heimHref },
    { key: "AWAY", label: "Auswärts", href: props.auswaertsHref },
  ];

  const teamSelectValue = props.teamFilter ?? "";

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 sm:col-span-2 min-[105rem]:col-span-1"
      aria-label="Filter"
      data-testid="spiele-filter-rail"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Filter</h3>
        <Link
          href={props.resetHref}
          className="text-xs font-medium text-[var(--sce-primary)] hover:underline"
          data-testid="spiele-filter-reset"
        >
          Zurücksetzen
        </Link>
      </div>

      <div className="space-y-3">
        <div>
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Heim / Auswärts
          </span>
          <div
            className="mt-1 inline-flex w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
            role="group"
            aria-label="Heim oder Auswärts"
          >
            {haItems.map((item) => {
              const active = props.homeAwayFilter === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  data-testid={`spiele-ha-filter-${item.key.toLowerCase()}`}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-colors",
                    active
                      ? "bg-[var(--sce-primary)] text-white shadow-sm"
                      : "text-[var(--text-2)] hover:text-[var(--foreground)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {props.tab === "SPIELPLANUNG" ? (
          <label className="block space-y-1">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Status
            </span>
            <select
              className="fca-input w-full text-sm"
              value={props.actionFilter}
              onChange={(event) => {
                const next = event.target.value as MatchcenterActionFilter;
                navigate(props.actionFilterHrefs[next]);
              }}
              aria-label="Status filtern"
              data-testid="spiele-status-filter"
            >
              {ACTION_FILTERS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
            {ACTION_FILTERS.map((item) => (
              <Link
                key={item.key}
                href={props.actionFilterHrefs[item.key]}
                className="sr-only"
                data-testid={`matchcenter-filter-${item.key.toLowerCase()}`}
                aria-current={props.actionFilter === item.key ? "true" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </label>
        ) : null}

        <div>
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Anzeige
          </span>
          <ul className="mt-1.5 space-y-1">
            {STATUS_ITEMS.map((item) => {
              const checked = maskSet.has(item.key);
              return (
                <li key={item.key}>
                  <Link
                    href={props.statusToggleHrefs[item.key]}
                    data-testid={`spiele-status-toggle-${item.key}`}
                    className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 text-xs hover:bg-[var(--surface-2)]"
                    aria-pressed={checked}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          checked
                            ? "border-[var(--sce-primary)] bg-[var(--sce-primary)] text-white"
                            : "border-[var(--border)] bg-[var(--surface)]",
                        )}
                        aria-hidden="true"
                      >
                        {checked ? "✓" : ""}
                      </span>
                      <span className="text-[var(--text-2)]">{item.label}</span>
                    </span>
                    <span className="tabular-nums text-[var(--muted)]">
                      {props.statusCounts[item.key]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <label className="block space-y-1">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Teams
          </span>
          <select
            className="fca-input w-full text-sm"
            value={teamSelectValue}
            onChange={(event) => {
              const key = event.target.value;
              navigate(props.teamHrefByValue[key] ?? props.teamHrefByValue[""]!);
            }}
            aria-label="Team filtern"
            data-testid="matchcenter-team-filter-trigger"
          >
            <option value="">Alle Teams</option>
            {props.teamOptions.map((team) => (
              <option key={team.id} value={team.id}>
                {team.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Wettbewerbe
          </span>
          <select
            className="fca-input w-full text-sm"
            value={props.competitionFilter ?? ""}
            onChange={(event) => {
              navigate(props.competitionHrefByValue[event.target.value] ?? props.competitionHrefByValue[""]!);
            }}
            aria-label="Wettbewerb filtern"
            data-testid="spiele-competition-filter"
          >
            <option value="">Alle Wettbewerbe</option>
            {props.competitionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Spielorte
          </span>
          <select
            className="fca-input w-full text-sm"
            value={props.venueFilter ?? ""}
            onChange={(event) => {
              navigate(props.venueHrefByValue[event.target.value] ?? props.venueHrefByValue[""]!);
            }}
            aria-label="Spielort filtern"
            data-testid="spiele-venue-filter"
          >
            <option value="">Alle Spielorte</option>
            {props.venueOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className="mt-3 rounded-lg border border-[var(--border)]/80 bg-[var(--surface-2)]/30 p-3"
        data-testid="spiele-matchvorbereitung-info"
      >
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold text-[var(--foreground)]">Matchvorbereitung</p>
            <p className="text-[0.6875rem] leading-relaxed text-[var(--muted)]">
              Bereite deine Spiele optimal vor: Prüfe Spielfeld, Kabinen und Infoboard-Einträge.
            </p>
          </div>
        </div>
      </div>

      {/* Legacy test hook — filter rail replaced Schnellfilter */}
      <span className="sr-only" data-testid="spiele-schnellfilter" />
    </section>
  );
}
