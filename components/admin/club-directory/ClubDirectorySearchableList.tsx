"use client";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Search, Shield, Building2 } from "lucide-react";
import { ArchiveSceIcon } from "@/components/icons/domain-sce-icon-components";
import { EmptyState } from "@/components/ui/page";
import { ClubDirectoryRow, type ClubDirectoryListItem } from "./ClubDirectoryRow";
import { ClubDirectoryFilterBar, buildVereineHref } from "./ClubDirectoryFilterBar";
import {
  applyClubDirectoryViewFilters,
  clubDirectoryFiltersActive,
  type ClubDirectoryProviderFilter,
  type ClubDirectoryTeamsFilter,
} from "@/lib/club-directory/directory-view-filters";
import {
  CLUB_DIRECTORY_SEARCH_MIN_CHARS,
  fetchAllClubDirectoryBrowseClubs,
  fetchAllClubDirectorySearchMatches,
  fetchClubDirectoryClubsPage,
  type ClubDirectoryClientClub,
} from "@/lib/club-directory/club-directory-client";
import { CLUB_DIRECTORY_MAX_LIMIT } from "@/lib/club-directory/query-service";

type ClubDirectorySearchableListProps = {
  showArchived?: boolean;
  providerFilter?: ClubDirectoryProviderFilter;
  teamsFilter?: ClubDirectoryTeamsFilter;
  initialQuery?: string;
};

function mapClub(club: ClubDirectoryClientClub): ClubDirectoryListItem {
  return {
    id: club.id,
    name: club.name,
    shortName: club.shortName,
    alternativeName: club.alternativeName ?? null,
    logoUrl: club.logoUrl,
    source: club.source ?? "MANUAL",
    archivedAt: club.archivedAt ?? null,
    teamCount: club.teamCount ?? 0,
    hasProviderMapping: club.hasProviderMapping ?? false,
  };
}

const BROWSE_PAGE_SIZE = CLUB_DIRECTORY_MAX_LIMIT;
const SEARCH_DEBOUNCE_MS = 300;

export default function ClubDirectorySearchableList({
  showArchived = false,
  providerFilter = "all",
  teamsFilter = "all",
  initialQuery = "",
}: ClubDirectorySearchableListProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [clubs, setClubs] = useState<ClubDirectoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browseSkip, setBrowseSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [activeTotal, setActiveTotal] = useState(0);
  const [archivedTotal, setArchivedTotal] = useState(0);
  const [searchMode, setSearchMode] = useState(false);
  const [fullBrowseForFilters, setFullBrowseForFilters] = useState(false);

  const filtersActive = clubDirectoryFiltersActive(providerFilter, teamsFilter);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  const refreshTabTotals = useCallback(async () => {
    try {
      const [activeMeta, archivedMeta] = await Promise.all([
        fetchClubDirectoryClubsPage({ limit: 1, skip: 0, archivedOnly: false }),
        fetchClubDirectoryClubsPage({ limit: 1, skip: 0, archivedOnly: true }),
      ]);
      setActiveTotal(activeMeta.meta.total);
      setArchivedTotal(archivedMeta.meta.total);
    } catch {
      // Non-blocking — tab badges are informational.
    }
  }, []);

  const loadBrowsePage = useCallback(
    async (skip: number, append: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      setSearchMode(false);
      setFullBrowseForFilters(false);

      try {
        const { clubs: pageClubs, meta } = await fetchClubDirectoryClubsPage({
          limit: BROWSE_PAGE_SIZE,
          skip,
          archivedOnly: showArchived,
          signal: controller.signal,
        });
        const mapped = pageClubs.map(mapClub);
        setClubs((prev) => (append ? [...prev, ...mapped] : mapped));
        setBrowseSkip(skip);
        setHasMore(meta.hasMore);
        setTotal(meta.total);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Vereine konnten nicht geladen werden.");
        if (!append) setClubs([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [showArchived],
  );

  const loadFullBrowseForFilters = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setSearchMode(false);
    setFullBrowseForFilters(true);
    setHasMore(false);

    try {
      const results = await fetchAllClubDirectoryBrowseClubs({
        archivedOnly: showArchived,
        signal: controller.signal,
      });
      const mapped = results.map(mapClub);
      setClubs(mapped);
      setTotal(mapped.length);
      setBrowseSkip(0);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Vereine konnten nicht geladen werden.");
      setClubs([]);
      setTotal(0);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [showArchived]);

  const runSearch = useCallback(
    async (term: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setSearchMode(true);
      setFullBrowseForFilters(false);
      setHasMore(false);

      try {
        const results = await fetchAllClubDirectorySearchMatches(term, {
          archivedOnly: showArchived,
          signal: controller.signal,
        });
        const mapped = results.map(mapClub);
        setClubs(mapped);
        setTotal(mapped.length);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Suche fehlgeschlagen.");
        setClubs([]);
        setTotal(0);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [showArchived],
  );

  useEffect(() => {
    refreshTabTotals();
  }, [refreshTabTotals]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (query !== initialQuery) return;
    const trimmed = initialQuery.trim();
    if (trimmed.length >= CLUB_DIRECTORY_SEARCH_MIN_CHARS) {
      runSearch(trimmed);
      return;
    }
    if (filtersActive) {
      loadFullBrowseForFilters();
      return;
    }
    loadBrowsePage(0, false);
  }, [
    showArchived,
    providerFilter,
    teamsFilter,
    initialQuery,
    query,
    filtersActive,
    loadBrowsePage,
    loadFullBrowseForFilters,
    runSearch,
  ]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const trimmed = query.trim();

    if (trimmed.length < CLUB_DIRECTORY_SEARCH_MIN_CHARS) {
      if (trimmed.length === 0 && query !== initialQuery) {
        if (filtersActive) loadFullBrowseForFilters();
        else loadBrowsePage(0, false);
      }
      return;
    }

    debounceRef.current = setTimeout(() => {
      runSearch(trimmed);
      const params = new URLSearchParams(window.location.search);
      params.set("q", trimmed);
      if (showArchived) params.set("view", "archived");
      if (providerFilter !== "all") params.set("provider", providerFilter);
      if (teamsFilter !== "all") params.set("teams", teamsFilter);
      router.replace(`/dashboard/vereine?${params.toString()}`);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [
    query,
    router,
    initialQuery,
    runSearch,
    loadBrowsePage,
    loadFullBrowseForFilters,
    filtersActive,
    showArchived,
    providerFilter,
    teamsFilter,
  ]);

  const visibleClubs = useMemo(
    () => applyClubDirectoryViewFilters(clubs, providerFilter, teamsFilter),
    [clubs, providerFilter, teamsFilter],
  );

  const listHint = useMemo(() => {
    if (loading) return null;
    const count = visibleClubs.length;
    const noun = count === 1 ? "Verein" : "Vereine";
    if (searchMode || filtersActive) {
      if (filtersActive && !searchMode) {
        return `${count} ${noun}${count === 1 ? "" : ""} nach Filter`;
      }
      return count === 1
        ? "1 Treffer im kanonischen Vereinsverzeichnis"
        : `${count} Treffer im kanonischen Vereinsverzeichnis`;
    }
    if (total > clubs.length) {
      return `Zeigt ${clubs.length} von ${total} Vereinen — suchen oder „Mehr laden“.`;
    }
    return `${total} ${noun}`;
  }, [loading, searchMode, filtersActive, total, clubs.length, visibleClubs.length]);

  const emptyDueToFilters =
    !loading && clubs.length > 0 && visibleClubs.length === 0 && filtersActive;

  return (
    <div className="w-full space-y-4" data-testid="vereine-directory-workspace">
      {archivedTotal > 0 || activeTotal > 0 ? (
        <div
          className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1"
          role="tablist"
          aria-label="Vereinsstatus"
        >
          <Link
            href={buildVereineHref(false, providerFilter, teamsFilter, initialQuery)}
            role="tab"
            aria-selected={!showArchived}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
              !showArchived
                ? "bg-[var(--surface-2)] text-[var(--foreground)] font-semibold shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <ProductDomainSceIcon name="org-unit" size={16} />
            Aktiv
            <span className="ml-1 rounded-full bg-[var(--border)] px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums text-[var(--muted)]">
              {activeTotal}
            </span>
          </Link>
          <Link
            href={buildVereineHref(true, providerFilter, teamsFilter, initialQuery)}
            role="tab"
            aria-selected={showArchived}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
              showArchived
                ? "bg-[var(--surface-2)] text-[var(--foreground)] font-semibold shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <ArchiveSceIcon className="h-4 w-4" />
            Archiviert
            <span className="ml-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums text-amber-200/90">
              {archivedTotal}
            </span>
          </Link>
        </div>
      ) : null}

      <div className="sce-page-search">
        <Search className="h-4 w-4 flex-shrink-0 text-[var(--muted)]" />
        <input
          type="text"
          placeholder="Verein suchen nach Name oder Kurzname…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          data-testid="vereine-directory-search"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              const params = new URLSearchParams(window.location.search);
              params.delete("q");
              const qs = params.toString();
              router.replace(qs ? `/dashboard/vereine?${qs}` : "/dashboard/vereine");
            }}
            className="flex-shrink-0 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Löschen
          </button>
        ) : null}
      </div>

      <ClubDirectoryFilterBar
        showArchived={showArchived}
        provider={providerFilter}
        teams={teamsFilter}
      />

      {query.trim().length > 0 && query.trim().length < CLUB_DIRECTORY_SEARCH_MIN_CHARS ? (
        <p className="text-xs text-[var(--muted)]">
          Mindestens {CLUB_DIRECTORY_SEARCH_MIN_CHARS} Zeichen für die serverseitige Suche im gesamten Verzeichnis.
        </p>
      ) : null}

      {listHint ? (
        <p className="text-xs font-medium text-[var(--muted)]" data-testid="vereine-directory-hint">
          {listHint}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--sce-danger)]" role="alert">{error}</p>
      ) : null}

      {loading && visibleClubs.length === 0 ? (
        <div className="flex items-center gap-2 py-8 text-sm text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Vereine werden geladen…
        </div>
      ) : null}

      {!loading && visibleClubs.length === 0 && query.trim().length >= CLUB_DIRECTORY_SEARCH_MIN_CHARS ? (
        <EmptyState
          icon={<Search className="h-10 w-10" />}
          heading="Keine Treffer"
          description={`Für „${query}" wurden keine Vereine im kanonischen Verzeichnis gefunden.`}
        />
      ) : null}

      {emptyDueToFilters ? (
        <EmptyState
          icon={<Search className="h-10 w-10" />}
          heading="Keine Vereine für diese Filter"
          description="Passe die Filter an oder setze sie zurück, um mehr Einträge zu sehen."
        />
      ) : null}

      {!loading && clubs.length === 0 && !query.trim() && !filtersActive ? (
        <EmptyState
          icon={showArchived ? <ArchiveSceIcon className="h-10 w-10" /> : <ProductDomainSceIcon name="roles-access" size={48} />}
          heading={showArchived ? "Keine archivierten Vereine" : "Noch keine Vereine erfasst"}
          description={
            showArchived
              ? "Archivierte Vereine werden hier angezeigt und können wiederhergestellt werden."
              : "Erfasse den ersten externen Verein — manuell oder später per Anbieter-Verknüpfung."
          }
          action={
            !showArchived ? (
              <Link href="/dashboard/vereine/new" className="fca-button-primary">
                Ersten Verein erstellen
              </Link>
            ) : undefined
          }
        />
      ) : null}

      {visibleClubs.length > 0 ? (
        <div
          className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
          data-testid="vereine-directory-list"
        >
          <div className="hidden border-b border-[var(--border)] px-5 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] sm:grid sm:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,0.9fr)_auto] sm:gap-4">
            <span>Verein</span>
            <span className="text-right">Teams</span>
            <span className="text-right">Anbieter</span>
            <span className="w-5" aria-hidden />
          </div>
          <div className="divide-y divide-[var(--border)]">
            {visibleClubs.map((club) => (
              <ClubDirectoryRow key={club.id} club={club} showArchivedScope={showArchived} />
            ))}
          </div>
        </div>
      ) : null}

      {!searchMode && !fullBrowseForFilters && hasMore && !loading && !filtersActive ? (
        <button
          type="button"
          className="fca-button-secondary w-full sm:w-auto"
          disabled={loadingMore}
          onClick={() => loadBrowsePage(browseSkip + BROWSE_PAGE_SIZE, true)}
          data-testid="vereine-directory-load-more"
        >
          {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Mehr laden
        </button>
      ) : null}
    </div>
  );
}
