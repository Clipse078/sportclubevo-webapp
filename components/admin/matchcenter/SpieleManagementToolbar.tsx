"use client";

import { CircleDot, Filter, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState, useTransition } from "react";
import MatchcenterTeamFilter from "./MatchcenterTeamFilter";
import {
  buildMatchcenterHref,
  type MatchcenterTeamOption,
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
};

const CONTROL =
  "h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]";

const WOCHENPLAN_FILTERS: { key: MatchcenterWochenplanFilter; label: string }[] = [
  { key: "ALLE", label: "Alle" },
  { key: "IM_WOCHENPLAN", label: "Im Wochenplan" },
  { key: "NICHT_IM_WOCHENPLAN", label: "Nicht im Wochenplan" },
];

const STATUS_FILTERS: { key: MatchcenterActionFilter; label: string }[] = [
  { key: "ALLE", label: "Alle" },
  { key: "OFFEN", label: "Offen" },
  { key: "ERLEDIGT", label: "Bereit" },
];

function SpieleManagementToolbarInner({
  teamOptions,
  teamFilter,
  basePath,
  tab,
  month,
  actionFilter,
  wochenplanFilter,
  searchValue = "",
  sortValue,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(searchValue);
  const [extraOpen, setExtraOpen] = useState(false);
  const extraRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchDraft(searchValue);
  }, [searchValue]);

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
    if (searchDraft === searchValue) return;
    debounceRef.current = setTimeout(() => pushSearch(searchDraft), 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchDraft, searchValue, pushSearch]);

  function hrefWithStatus(nextFilter: MatchcenterActionFilter) {
    return buildMatchcenterHref(basePath, {
      tab,
      month,
      actionFilter: nextFilter,
      wochenplanFilter,
      teamFilter,
      search: searchValue,
      sort: sortValue,
    });
  }

  function hrefWithWochenplan(next: MatchcenterWochenplanFilter) {
    return buildMatchcenterHref(basePath, {
      tab,
      month,
      actionFilter,
      wochenplanFilter: next,
      teamFilter,
      search: searchValue,
      sort: sortValue,
    });
  }

  return (
    <div
      className="flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-center"
      data-testid="spiele-management-toolbar"
    >
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
          placeholder="Suche (Team, Gegner, Wettbewerb)…"
          className={cn(CONTROL, "w-full pl-9 pr-3")}
          data-testid="spiele-search-input"
        />
      </label>

      <MatchcenterTeamFilter
        teams={teamOptions}
        teamFilter={teamFilter}
        basePath={basePath}
        tab={tab}
        month={month}
        actionFilter={actionFilter}
        wochenplanFilter={wochenplanFilter}
        urlSearch={searchValue}
        urlSort={sortValue}
      />

      {tab === "SPIELPLANUNG" ? (
        <label className="relative min-w-[9rem]">
          <span className="sr-only">Status filtern</span>
          <CircleDot
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden="true"
          />
          <select
            value={actionFilter}
            onChange={(event) => {
              const href = hrefWithStatus(event.target.value as MatchcenterActionFilter);
              startTransition(() => router.replace(href));
            }}
            className={cn(CONTROL, "w-full min-w-[9rem] appearance-none pl-9 pr-8")}
            data-testid="spiele-status-filter"
          >
            {STATUS_FILTERS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label === "Alle" ? "Status" : item.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div ref={extraRef} className="relative">
        <button
          type="button"
          onClick={() => setExtraOpen((value) => !value)}
          className={cn(
            CONTROL,
            "inline-flex items-center gap-2 px-3",
            wochenplanFilter !== "ALLE" && "border-[var(--sce-primary)]/40 bg-[var(--sce-primary)]/5",
          )}
          data-testid="spiele-extra-filters-trigger"
          aria-expanded={extraOpen}
        >
          <Filter className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
          Weitere
        </button>
        {extraOpen ? (
          <div
            className="absolute left-0 top-full z-50 mt-1 min-w-[14rem] rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-2 shadow-[var(--shadow-lg)]"
            data-testid="spiele-extra-filters-menu"
          >
            <p className="px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Wochenplan
            </p>
            {WOCHENPLAN_FILTERS.map((item) => {
              const active = item.key === wochenplanFilter;
              return (
                <Link
                  key={item.key}
                  href={hrefWithWochenplan(item.key)}
                  onClick={() => setExtraOpen(false)}
                  data-testid={`matchcenter-wochenplan-filter-${item.key.toLowerCase()}`}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "block rounded-md px-2 py-1.5 text-sm transition hover:bg-[var(--surface-2)]",
                    active && "bg-[var(--surface-2)] font-semibold",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      {tab === "SPIELPLANUNG"
        ? STATUS_FILTERS.map((item) => (
            <Link
              key={item.key}
              href={hrefWithStatus(item.key)}
              className="sr-only"
              data-testid={`matchcenter-filter-${item.key.toLowerCase()}`}
              aria-current={actionFilter === item.key ? "true" : undefined}
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
