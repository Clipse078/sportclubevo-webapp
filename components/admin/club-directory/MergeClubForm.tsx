"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronRight, Merge, Search, X } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { SectionCard } from "@/components/ui/page";
import { ClubLogo } from "./ClubLogo";
import type { ExternalTeamCompetitionContext } from "@/lib/club-directory/competition-context";

type ClubSearchResult = {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  teamCount: number;
  hasProviderMapping: boolean;
  archivedAt: string | null;
};

type ClubDetail = {
  id: string;
  name: string;
  logoUrl: string | null;
  teams: {
    id: string;
    name: string;
    archivedAt: string | null;
    competitionContext: ExternalTeamCompetitionContext;
  }[];
  providerMappings: { id: string; provider: string; providerClubId: number }[];
};

type MergeClubFormProps = {
  survivingClub: {
    id: string;
    name: string;
    shortName: string | null;
    logoUrl: string | null;
    teamCount?: number;
    hasProviderMapping?: boolean;
  };
};

export default function MergeClubForm({ survivingClub }: MergeClubFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClubSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<Record<string, ClubDetail>>({});
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSearchQuery = query.trim().length > 0;

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      if (!hasSearchQuery) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const params = new URLSearchParams({ limit: "20", search: query.trim() });
        const res = await fetch(`/api/club-directory/clubs?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && Array.isArray(data?.clubs)) {
          setSearchResults(
            data.clubs.filter(
              (c: ClubSearchResult) =>
                c.id !== survivingClub.id && !selectedIds.includes(c.id) && !c.archivedAt,
            ),
          );
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, survivingClub.id, selectedIds, hasSearchQuery]);

  async function addLosingClub(clubId: string) {
    setError(null);
    setSelectedIds((prev) => [...prev, clubId]);

    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/club-directory/clubs/${clubId}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.club) {
        setSelectedDetails((prev) => ({ ...prev, [clubId]: data.club }));
      }
    } finally {
      setLoadingPreview(false);
    }
  }

  function removeLosingClub(clubId: string) {
    setSelectedIds((prev) => prev.filter((id) => id !== clubId));
    setSelectedDetails((prev) => {
      const next = { ...prev };
      delete next[clubId];
      return next;
    });
    setConfirming(false);
  }

  const totals = useMemo(() => {
    let teams = 0;
    let mappings = 0;
    for (const id of selectedIds) {
      const detail = selectedDetails[id];
      if (!detail) continue;
      teams += detail.teams.length;
      mappings += detail.providerMappings.length;
    }
    return { teams, mappings };
  }, [selectedIds, selectedDetails]);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/club-directory/clubs/${survivingClub.id}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ losingClubIds: selectedIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Zusammenführung fehlgeschlagen.");
        setConfirming(false);
        return;
      }
      router.push(`/dashboard/vereine/${survivingClub.id}`);
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  const survivingMeta = [
    survivingClub.teamCount != null ? `${survivingClub.teamCount} Team${survivingClub.teamCount === 1 ? "" : "s"}` : null,
    survivingClub.hasProviderMapping ? "Anbieter-verknüpft" : "Manuell erfasst",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6" data-testid="merge-club-form">
      <SectionCard
        title="1 · Bleibender Verein"
        description="Alle Teams und Anbieter-Verknüpfungen der ausgewählten Duplikate werden auf diesen Verein übertragen."
        accent
        bodyClassName="p-0"
      >
        <div
          className="flex flex-wrap items-center gap-4 border-l-2 border-[var(--sce-success)] px-5 py-4"
          data-testid="merge-surviving-club"
        >
          <ClubLogo logoUrl={survivingClub.logoUrl} name={survivingClub.name} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-[var(--foreground)]">{survivingClub.name}</p>
              <Badge variant="success" size="sm">Bleibt aktiv</Badge>
            </div>
            {survivingClub.shortName ? (
              <p className="text-xs text-[var(--muted)]">{survivingClub.shortName}</p>
            ) : null}
            {survivingMeta ? <p className="mt-1 text-xs text-[var(--text-2)]">{survivingMeta}</p> : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="2 · Duplikate auswählen" description="Zu vereinigende Duplikate" noPadding>
        <div className="space-y-4 px-5 py-4">
          <p className="text-xs text-[var(--muted)]">
            Duplikat-Vereine werden archiviert, nicht gelöscht. Teams und Anbieter-Verknüpfungen werden
            verschoben.
          </p>

          <div className="sce-page-search" data-testid="merge-club-search">
            <Search className="h-4 w-4 flex-shrink-0 text-[var(--muted)]" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Verein suchen…"
              aria-label="Verein suchen"
              autoComplete="off"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="flex-shrink-0 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Löschen
              </button>
            ) : null}
          </div>

          {searching ? (
            <p className="text-xs text-[var(--muted)]">Suche…</p>
          ) : null}

          {!hasSearchQuery ? (
            <p
              className="rounded-lg border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]"
              data-testid="merge-search-empty-initial"
            >
              Suche nach einem Verein, um mögliche Duplikate auszuwählen.
            </p>
          ) : null}

          {hasSearchQuery && !searching && searchResults.length === 0 ? (
            <p className="text-sm text-[var(--muted)]" data-testid="merge-search-no-results">
              Keine passenden Vereine gefunden.
            </p>
          ) : null}

          {searchResults.length > 0 ? (
            <ul className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 p-1">
              {searchResults.map((club) => (
                <li key={club.id}>
                  <button
                    type="button"
                    onClick={() => addLosingClub(club.id)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition hover:bg-[var(--surface-2)]"
                  >
                    <ClubLogo logoUrl={club.logoUrl} name={club.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                        {club.name}
                      </span>
                      <span className="block text-xs text-[var(--muted)]">
                        {club.teamCount} Team{club.teamCount !== 1 ? "s" : ""}
                        {club.hasProviderMapping ? " · Anbieter-verknüpft" : " · Manuell"}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {selectedIds.length > 0 ? (
            <div className="space-y-2" data-testid="merge-selected-list">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Ausgewählt ({selectedIds.length})
              </p>
              <ul className="space-y-2">
                {selectedIds.map((id) => {
                  const detail = selectedDetails[id];
                  return (
                    <li
                      key={id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Check className="h-4 w-4 text-[var(--sce-success)]" aria-hidden />
                          <span className="truncate text-sm font-semibold text-[var(--foreground)]">
                            {detail?.name ?? id}
                          </span>
                          <Badge variant="outline" size="sm">Wird archiviert</Badge>
                        </div>
                        {detail ? (
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {detail.teams.length} Team{detail.teams.length !== 1 ? "s" : ""} ·{" "}
                            {detail.providerMappings.length} Anbieter-Verknüpfung
                            {detail.providerMappings.length !== 1 ? "en" : ""} werden übertragen
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-[var(--muted)]">Lädt…</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLosingClub(id)}
                        className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                        aria-label="Auswahl entfernen"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {selectedIds.length > 0 ? (
        <SectionCard title="3 · Zusammenführung prüfen" noPadding>
          <div className="space-y-4 px-5 py-4" data-testid="merge-review">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Bleibt bestehen
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{survivingClub.name}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Wird zusammengeführt
                </p>
                <ul className="mt-1 space-y-0.5 text-sm text-[var(--text-2)]">
                  {selectedIds.map((id) => (
                    <li key={id} className="truncate">
                      {selectedDetails[id]?.name ?? id}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 px-4 py-3 text-sm text-[var(--text-2)]">
              <p className="font-medium text-[var(--foreground)]">Übernommen:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                <li>
                  <strong>{totals.teams}</strong> Team{totals.teams !== 1 ? "s" : ""} werden auf den
                  bleibenden Verein verschoben
                </li>
                <li>
                  <strong>{totals.mappings}</strong> Anbieter-Verknüpfung{totals.mappings !== 1 ? "en" : ""}{" "}
                  werden übertragen
                </li>
                <li>
                  <strong>{selectedIds.length}</strong> Duplikat-Verein{selectedIds.length !== 1 ? "e" : ""}{" "}
                  werden archiviert (nicht gelöscht)
                </li>
              </ul>
            </div>

            {error ? <p className="text-sm font-medium text-[var(--sce-danger)]">{error}</p> : null}

            {confirming ? (
              <div
                className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 p-4"
                data-testid="merge-confirm-panel"
              >
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {selectedIds.length} Verein{selectedIds.length !== 1 ? "e" : ""} in „{survivingClub.name}“
                  zusammenführen?
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Teams und Anbieter-Verknüpfungen werden auf den bleibenden Verein übertragen. Die
                  Duplikat-Vereine werden archiviert und können wiederhergestellt werden.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    loading={submitting}
                    iconLeft={<Merge className="h-4 w-4" />}
                    onClick={handleConfirm}
                  >
                    Zusammenführung durchführen
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={submitting}
                    onClick={() => setConfirming(false)}
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
        <Link href={`/dashboard/vereine/${survivingClub.id}`}>
          <Button type="button" variant="secondary">Abbrechen</Button>
        </Link>
        <Button
          type="button"
          variant="primary"
          disabled={selectedIds.length === 0 || loadingPreview}
          iconLeft={<Merge className="h-4 w-4" />}
          onClick={() => setConfirming(true)}
          data-testid="merge-primary-cta"
          aria-label={
            selectedIds.length > 0
              ? `${selectedIds.length} Vereine zusammenführen`
              : "Vereine zusammenführen"
          }
        >
          {selectedIds.length > 0
            ? `${selectedIds.length} Verein${selectedIds.length !== 1 ? "e" : ""} zusammenführen`
            : "Vereine zusammenführen"}
        </Button>
      </div>
    </div>
  );
}
