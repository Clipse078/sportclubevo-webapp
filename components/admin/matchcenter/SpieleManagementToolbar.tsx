"use client";

import { ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState, useTransition } from "react";
import MatchcenterTeamFilter from "./MatchcenterTeamFilter";
import {
  buildMatchcenterHref,
  type MatchcenterTeamOption,
  type SpieleHomeAwayFilter,
  type SpieleListView,
  type SpieleStatusMaskKey,
} from "@/lib/matchcenter/navigation";
import type {
  MatchcenterActionFilter,
  MatchcenterTab,
  MatchcenterWochenplanFilter,
} from "@/lib/matchcenter/view-model";
import { cn } from "@/lib/cn";

type Props = {
  teamOptions: MatchcenterTeamOption[];
  teamFilter: string | null;
  basePath: string;
  tab: MatchcenterTab;
  month: string;
  actionFilter: MatchcenterActionFilter;
  wochenplanFilter: MatchcenterWochenplanFilter;
  searchValue?: string;
  sortValue?: string;
  homeAwayFilter: SpieleHomeAwayFilter;
  listView: SpieleListView;
  competitionFilter: string | null;
  venueFilter: string | null;
  statusMask: readonly SpieleStatusMaskKey[];
  competitionOptions: string[];
  venueOptions: string[];
};

const CONTROL =
  "h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]";

const STATUS_FILTERS: { key: MatchcenterActionFilter; label: string }[] = [
  { key: "ALLE", label: "Alle Status" },
  { key: "OFFEN", label: "Offen" },
  { key: "ERLEDIGT", label: "Bereit" },
];

function baseParams(props: Props) {
  return {
    tab: props.tab,
    month: props.month,
    actionFilter: props.actionFilter,
    wochenplanFilter: props.wochenplanFilter,
    teamFilter: props.teamFilter,
    search: props.searchValue,
    sort: props.sortValue,
    homeAwayFilter: props.homeAwayFilter,
    listView: props.listView,
    competitionFilter: props.competitionFilter,
    venueFilter: props.venueFilter,
    statusMask: props.statusMask,
  };
}

function SpieleManagementToolbarInner(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(props.searchValue ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchDraft(props.searchValue ?? "");
  }, [props.searchValue]);

  const pushSearch = useCallback(
    (nextSearch: string) => {
      const next = new URLSearchParams(searchParams.toString());
      const trimmed = nextSearch.trim();
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, searchParams, startTransition],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchDraft === (props.searchValue ?? "")) return;
    debounceRef.current = setTimeout(() => pushSearch(searchDraft), 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchDraft, props.searchValue, pushSearch]);

  function hrefWith(partial: Partial<ReturnType<typeof baseParams>>) {
    return buildMatchcenterHref(props.basePath, { ...baseParams(props), ...partial });
  }

  return (
    <div
      className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center"
      data-testid="spiele-management-toolbar"
    >
      <MatchcenterTeamFilter
        teams={props.teamOptions}
        teamFilter={props.teamFilter}
        basePath={props.basePath}
        tab={props.tab}
        month={props.month}
        actionFilter={props.actionFilter}
        wochenplanFilter={props.wochenplanFilter}
        urlSearch={props.searchValue}
        urlSort={props.sortValue}
        spieleFilters={{
          homeAwayFilter: props.homeAwayFilter,
          listView: props.listView,
          competitionFilter: props.competitionFilter,
          venueFilter: props.venueFilter,
          statusMask: props.statusMask,
        }}
      />

      <label className="relative min-w-[9.5rem]">
        <span className="sr-only">Wettbewerb filtern</span>
        <select
          value={props.competitionFilter ?? ""}
          onChange={(event) => {
            const value = event.target.value || null;
            startTransition(() => router.replace(hrefWith({ competitionFilter: value })));
          }}
          className={cn(CONTROL, "w-full min-w-[9.5rem] appearance-none px-3 pr-8")}
          data-testid="spiele-competition-filter"
        >
          <option value="">Alle Wettbewerbe</option>
          {props.competitionOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden="true"
        />
      </label>

      <label className="relative min-w-[9.5rem]">
        <span className="sr-only">Spielort filtern</span>
        <select
          value={props.venueFilter ?? ""}
          onChange={(event) => {
            const value = event.target.value || null;
            startTransition(() => router.replace(hrefWith({ venueFilter: value })));
          }}
          className={cn(CONTROL, "w-full min-w-[9.5rem] appearance-none px-3 pr-8")}
          data-testid="spiele-venue-filter"
        >
          <option value="">Alle Spielorte</option>
          {props.venueOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden="true"
        />
      </label>

      {props.tab === "SPIELPLANUNG" ? (
        <label className="relative min-w-[8.5rem]">
          <span className="sr-only">Status filtern</span>
          <select
            value={props.actionFilter}
            onChange={(event) => {
              const next = event.target.value as MatchcenterActionFilter;
              let nextMask: SpieleStatusMaskKey[] = ["anstehend", "offen", "bereit"];
              if (next === "OFFEN") nextMask = ["offen"];
              if (next === "ERLEDIGT") nextMask = ["bereit"];
              startTransition(() =>
                router.replace(
                  hrefWith({ actionFilter: next, statusMask: nextMask }),
                ),
              );
            }}
            className={cn(CONTROL, "w-full min-w-[8.5rem] appearance-none px-3 pr-8")}
            data-testid="spiele-status-filter"
          >
            {STATUS_FILTERS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden="true"
          />
        </label>
      ) : null}

      <label className="relative min-w-[12rem] flex-1">
        <span className="sr-only">Spiele durchsuchen</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Suche in Spielen…"
          className={cn(CONTROL, "w-full pl-9 pr-3")}
          data-testid="spiele-search-input"
        />
      </label>

      {props.tab === "SPIELPLANUNG"
        ? STATUS_FILTERS.map((item) => (
            <Link
              key={item.key}
              href={hrefWith({ actionFilter: item.key })}
              className="sr-only"
              data-testid={`matchcenter-filter-${item.key.toLowerCase()}`}
              aria-current={props.actionFilter === item.key ? "true" : undefined}
            >
              {item.label}
            </Link>
          ))
        : null}
    </div>
  );
}

export default function SpieleManagementToolbar(props: Props) {
  return (
    <Suspense fallback={null}>
      <SpieleManagementToolbarInner {...props} />
    </Suspense>
  );
}
