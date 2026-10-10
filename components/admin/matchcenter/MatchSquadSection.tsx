"use client";

import { useCallback, useEffect, useState } from "react";
import PlanningEditorParticipantsSection from "@/components/admin/shared/planning-editor/PlanningEditorParticipantsSection";
import { Loader2 } from "lucide-react";
import MatchSquadCountsSummary, {
  type MatchSquadAvailabilityFilter,
} from "@/components/admin/matchcenter/MatchSquadCountsSummary";
import MatchAvailabilityCollectionPanel from "@/components/admin/matchcenter/MatchAvailabilityCollectionPanel";
import MatchSquadPlayerList from "@/components/admin/matchcenter/MatchSquadPlayerList";
import { matchSquadRemainingEmptyMessage } from "@/lib/match-squad/remaining-empty-copy";
import type {
  MatchAvailabilityCollectionMetaView,
  MatchSquadPlayerPresentation,
} from "@/lib/match-squad/types";

type SquadPayload = {
  version: string;
  editable: boolean;
  canEdit?: boolean;
  readOnlyReason: string | null;
  selected: MatchSquadPlayerPresentation[];
  remaining: MatchSquadPlayerPresentation[];
  teamDisplayName: string | null;
  counts?: {
    rosterTotal: number;
    available: number;
    unavailable: number;
    maybe: number;
    open: number;
    selected: number;
    selectedAvailable: number;
    selectedMaybe: number;
    selectedOpen: number;
    conflicts: number;
  };
  availabilityCollection?: MatchAvailabilityCollectionMetaView;
  canManageAvailability?: boolean;
  canManageRelease?: boolean;
  releaseReadOnly?: boolean;
  teamId?: string;
  teamSeasonId?: string;
};

type Props = {
  matchId: string;
  timeZone?: string;
};

type SquadApiBody = SquadPayload & { error?: string; code?: string; squad?: SquadPayload };

async function readSquadApiBody(response: Response): Promise<SquadApiBody> {
  const raw = await response.text();
  if (!raw.trim()) {
    throw new Error("Aufgebot konnte nicht geladen werden.");
  }
  try {
    return JSON.parse(raw) as SquadApiBody;
  } catch {
    throw new Error("Aufgebot konnte nicht geladen werden.");
  }
}

function resolveLoadErrorMessage(body: SquadApiBody, response: Response): string {
  if (body.error?.trim()) {
    return body.error;
  }
  if (response.status === 401) {
    return "Bitte melden Sie sich erneut an.";
  }
  if (response.status === 403) {
    return "Keine Berechtigung für dieses Aufgebot.";
  }
  if (response.status === 404) {
    return "Spiel nicht gefunden.";
  }
  return "Aufgebot konnte nicht geladen werden.";
}

function playerMatchesAvailabilityFilter(
  player: MatchSquadPlayerPresentation,
  filter: MatchSquadAvailabilityFilter,
): boolean {
  if (filter === "ALL") return true;
  if (filter === "OPEN") return player.presentationStatus === "OPEN";
  if (filter === "MAYBE") return player.presentationStatus === "MAYBE";
  return true;
}

export default function MatchSquadSection({ matchId, timeZone = "Europe/Zurich" }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SquadPayload | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [version, setVersion] = useState<string>("");
  const [availabilityFilter, setAvailabilityFilter] =
    useState<MatchSquadAvailabilityFilter>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/matchcenter/${matchId}/match-squad`, {
        cache: "no-store",
      });
      const json = await readSquadApiBody(response);
      if (!response.ok) {
        throw new Error(resolveLoadErrorMessage(json, response));
      }
      setData(json);
      setSelectedIds(json.selected.map((row) => row.personId));
      setVersion(json.version);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aufgebot konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canMutate = Boolean(data?.canEdit ?? data?.editable) && !saving;

  async function persist(nextSelectedIds: string[]) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/matchcenter/${matchId}/match-squad`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedPersonIds: nextSelectedIds,
          expectedVersion: version,
        }),
      });
      const json = await readSquadApiBody(response);
      if (response.status === 409 && json.squad) {
        setData({ ...json.squad, canEdit: json.squad.canEdit });
        setSelectedIds(json.squad.selected.map((row) => row.personId));
        setVersion(json.squad.version);
        setError(json.error ?? "Konflikt — bitte erneut speichern.");
        return;
      }
      if (!response.ok) {
        throw new Error(json.error ?? "Speichern fehlgeschlagen.");
      }
      setData(json);
      setSelectedIds(json.selected.map((row) => row.personId));
      setVersion(json.version);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  function togglePerson(personId: string, select: boolean) {
    if (!canMutate) return;
    const next = select
      ? [...selectedIds, personId]
      : selectedIds.filter((id) => id !== personId);
    setSelectedIds(next);
    void persist(next);
  }

  const candidateMap = new Map<string, MatchSquadPlayerPresentation>();
  for (const row of [...(data?.selected ?? []), ...(data?.remaining ?? [])]) {
    candidateMap.set(row.personId, row);
  }
  for (const row of data?.selected ?? []) {
    if (!candidateMap.has(row.personId)) candidateMap.set(row.personId, row);
  }
  const selectedSet = new Set(selectedIds);
  const optimisticSelected = selectedIds
    .map((id) => candidateMap.get(id))
    .filter((row): row is MatchSquadPlayerPresentation => Boolean(row));
  const optimisticRemaining = [...candidateMap.values()].filter(
    (row) => !selectedSet.has(row.personId),
  );

  const filterPlayers = (rows: MatchSquadPlayerPresentation[]) =>
    rows.filter((row) => playerMatchesAvailabilityFilter(row, availabilityFilter));

  const filteredSelected = filterPlayers(optimisticSelected);
  const filteredRemaining = filterPlayers(optimisticRemaining);
  const canManageAvailability = Boolean(data?.canManageAvailability);

  const releaseContext =
    data?.teamId && data?.teamSeasonId
      ? {
          teamId: data.teamId,
          teamSeasonId: data.teamSeasonId,
          matchId,
          matchLabel: data.teamDisplayName
            ? `Spiel · ${data.teamDisplayName}`
            : "Aktuelles Spiel",
          canManageRelease: Boolean(data.canManageRelease),
          releaseReadOnly: Boolean(data.releaseReadOnly),
        }
      : undefined;

  return (
    <PlanningEditorParticipantsSection
      headingId="spiele-edit-match-squad-heading"
      testId="spiele-edit-match-squad-section"
      persisted
      title="Aufgebot"
      description={
        data?.teamDisplayName
          ? `Saison-Kader ${data.teamDisplayName} — Match-spezifische Spielerauswahl`
          : "Match-spezifische Spielerauswahl aus dem aktiven Saison-Kader"
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-[var(--muted)]" data-testid="match-squad-loading">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Aufgebot wird geladen…
        </div>
      ) : error ? (
        <div className="space-y-2" data-testid="match-squad-error">
          <p className="text-sm text-[var(--destructive)]">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-3)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-4)]"
            data-testid="match-squad-retry"
          >
            Erneut versuchen
          </button>
        </div>
      ) : null}

      {!loading && data?.readOnlyReason ? (
        <p className="mb-3 text-xs text-[var(--muted)]" data-testid="match-squad-readonly-reason">
          {data.readOnlyReason}
        </p>
      ) : null}

      {!loading && data?.availabilityCollection ? (
        <MatchAvailabilityCollectionPanel
          matchId={matchId}
          timeZone={timeZone}
          meta={data.availabilityCollection}
          canManage={canManageAvailability}
          onChanged={() => void load()}
        />
      ) : null}

      {!loading && data?.counts ? (
        <MatchSquadCountsSummary
          counts={data.counts}
          activeFilter={availabilityFilter}
          onFilterChange={setAvailabilityFilter}
        />
      ) : null}

      {!loading && availabilityFilter !== "ALL" ? (
        <p className="mb-2 text-xs text-[var(--muted)]" data-testid="match-squad-availability-filter-active">
          Filter: {availabilityFilter === "OPEN" ? "Nur Offen" : "Nur Unsicher"}
          {" · "}
          <button
            type="button"
            className="font-semibold text-[var(--foreground)] underline-offset-2 hover:underline"
            onClick={() => setAvailabilityFilter("ALL")}
          >
            Alle anzeigen
          </button>
        </p>
      ) : null}

      {!loading && data ? (
        <div className="space-y-8">
          <section aria-labelledby="match-squad-selected-heading">
            <h3
              id="match-squad-selected-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
            >
              Aufgeboten · {filteredSelected.length} Spieler
              {availabilityFilter !== "ALL" ? ` (gefiltert)` : ""}
            </h3>
            {filteredSelected.length === 0 ? (
              <p className="text-sm text-[var(--muted)]" data-testid="match-squad-empty-selected">
                Noch keine Spieler aufgeboten.
              </p>
            ) : (
              <MatchSquadPlayerList
                listTestId="match-squad-selected-list"
                players={filteredSelected}
                action="remove"
                canMutate={canMutate}
                onToggle={togglePerson}
                releaseContext={releaseContext}
              />
            )}
          </section>

          <section aria-labelledby="match-squad-remaining-heading">
            <h3
              id="match-squad-remaining-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
            >
              Weitere Kaderspieler · {filteredRemaining.length} Spieler
              {availabilityFilter !== "ALL" ? ` (gefiltert)` : ""}
            </h3>
            {filteredRemaining.length === 0 ? (
              <p
                className="text-sm text-[var(--muted)]"
                data-testid="match-squad-empty-remaining"
                data-roster-total={data.counts?.rosterTotal ?? 0}
              >
                {matchSquadRemainingEmptyMessage(data.counts?.rosterTotal ?? 0)}
              </p>
            ) : (
              <MatchSquadPlayerList
                listTestId="match-squad-remaining-list"
                players={filteredRemaining}
                action="add"
                canMutate={canMutate}
                onToggle={togglePerson}
                releaseContext={releaseContext}
              />
            )}
          </section>

          {saving ? (
            <p className="text-xs text-[var(--muted)]" data-testid="match-squad-saving">
              Speichert…
            </p>
          ) : null}
        </div>
      ) : null}
    </PlanningEditorParticipantsSection>
  );
}
