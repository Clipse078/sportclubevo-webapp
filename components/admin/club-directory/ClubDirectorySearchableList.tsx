"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Search, Shield, Users, Archive, Building2 } from "lucide-react";
import { EmptyState } from "@/components/ui/page";
import { Badge } from "@/components/ui";
import { ClubLogo } from "./ClubLogo";
import {
  CLUB_DIRECTORY_SEARCH_MIN_CHARS,
  fetchAllClubDirectorySearchMatches,
  fetchClubDirectoryClubsPage,
  type ClubDirectoryClientClub,
} from "@/lib/club-directory/club-directory-client";
import { CLUB_DIRECTORY_MAX_LIMIT } from "@/lib/club-directory/query-service";

export type ClubDirectoryListItem = {
  id: string;
  name: string;
  shortName: string | null;
  alternativeName: string | null;
  logoUrl: string | null;
  source: string;
  archivedAt: string | null;
  teamCount: number;
  hasProviderMapping: boolean;
};

type ClubDirectorySearchableListProps = {
  showArchived?: boolean;
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
}: ClubDirectorySearchableListProps) {
  const [query, setQuery] = useState("");
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

  const runSearch = useCallback(
    async (term: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setSearchMode(true);
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
    setQuery("");
    loadBrowsePage(0, false);
  }, [showArchived, loadBrowsePage]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const trimmed = query.trim();

    if (trimmed.length < CLUB_DIRECTORY_SEARCH_MIN_CHARS) {
      setSearchMode(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      runSearch(trimmed);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  const listHint = useMemo(() => {
    if (loading) return null;
    if (searchMode) {
      return total === 1
        ? "1 Treffer im kanonischen Vereinsverzeichnis"
        : `${total} Treffer im kanonischen Vereinsverzeichnis`;
    }
    if (total > clubs.length) {
      return `Zeigt ${clubs.length} von ${total} Vereinen — suchen oder „Mehr laden“.`;
    }
    return `${total} Verein${total === 1 ? "" : "e"} im Verzeichnis`;
  }, [loading, searchMode, total, clubs.length]);

  return (
    <div className="space-y-4">
      {archivedTotal > 0 || activeTotal > 0 ? (
        <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
          <Link
            href="/dashboard/vereine"
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
              !showArchived
                ? "bg-[var(--surface-2)] text-[var(--foreground)] font-semibold"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Building2 className="h-4 w-4" />
            Aktiv
            <span className="ml-1 rounded-full bg-[var(--border)] px-1.5 py-0.5 text-[0.65rem] font-semibold text-[var(--muted)]">
              {activeTotal}
            </span>
          </Link>
          <Link
            href="/dashboard/vereine?view=archived"
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
              showArchived
                ? "bg-[var(--surface-2)] text-[var(--foreground)] font-semibold"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Archive className="h-4 w-4" />
            Archiviert
            <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-700">
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
              loadBrowsePage(0, false);
            }}
            className="flex-shrink-0 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Löschen
          </button>
        ) : null}
      </div>

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

      {loading && clubs.length === 0 ? (
        <div className="flex items-center gap-2 py-8 text-sm text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Vereine werden geladen…
        </div>
      ) : null}

      {!loading && clubs.length === 0 && query.trim().length >= CLUB_DIRECTORY_SEARCH_MIN_CHARS ? (
        <EmptyState
          icon={<Search className="h-10 w-10" />}
          heading="Keine Treffer"
          description={`Für „${query}" wurden keine Vereine im kanonischen Verzeichnis gefunden.`}
        />
      ) : null}

      {!loading && clubs.length === 0 && !query.trim() ? (
        <EmptyState
          icon={showArchived ? <Archive className="h-10 w-10" /> : <Shield className="h-10 w-10" />}
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

      {clubs.length > 0 ? (
        <div className="sce-integrated-list" data-testid="vereine-directory-list">
          {clubs.map((club, idx) => (
            <Link
              key={club.id}
              href={`/dashboard/vereine/${club.id}`}
              className={`flex items-center gap-3 px-5 py-3.5 transition hover:bg-[var(--surface-2)] ${
                idx !== clubs.length - 1 ? "border-b border-[var(--border)]" : ""
              }`}
              data-testid={`vereine-club-row-${club.id}`}
            >
              <ClubLogo logoUrl={club.logoUrl} name={club.name} size="sm" />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--foreground)]">{club.name}</span>
                  {club.shortName ? (
                    <code className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0 text-[0.65rem] font-mono text-[var(--muted)]">
                      {club.shortName}
                    </code>
                  ) : null}
                  <Badge variant={club.hasProviderMapping ? "info" : "outline"} size="sm">
                    {club.hasProviderMapping ? "Anbieter-verknüpft" : "Manuell"}
                  </Badge>
                  {club.archivedAt ? (
                    <Badge variant="default" size="sm">Archiviert</Badge>
                  ) : null}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  <Users className="h-3 w-3" />
                  {club.teamCount} Team{club.teamCount !== 1 ? "s" : ""}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {!searchMode && hasMore && !loading ? (
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
