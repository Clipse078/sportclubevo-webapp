"use client";

import { useCallback, useEffect, useState } from "react";
import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import PlanningEditorParticipantsSection from "@/components/admin/shared/planning-editor/PlanningEditorParticipantsSection";
import { Loader2, Minus, Plus } from "lucide-react";
import MatchAvailabilityStatusBadge, {
  MatchAvailabilityConflictBadge,
} from "@/components/admin/matchcenter/MatchAvailabilityStatusBadge";
import MatchSquadCountsSummary, {
  type MatchSquadAvailabilityFilter,
} from "@/components/admin/matchcenter/MatchSquadCountsSummary";
import MatchAvailabilityCollectionPanel from "@/components/admin/matchcenter/MatchAvailabilityCollectionPanel";
import MatchAvailabilityTrainerRecordMenu from "@/components/admin/matchcenter/MatchAvailabilityTrainerRecordMenu";
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

function PlayerCard({
  player,
  action,
  onAction,
  disabled,
  matchId,
  canManageAvailability,
  onAvailabilityRecorded,
}: {
  player: MatchSquadPlayerPresentation;
  action: "add" | "remove";
  onAction: () => void;
  disabled: boolean;
  matchId: string;
  canManageAvailability: boolean;
  onAvailabilityRecorded: () => void;
}) {
  return (
    <li
      className="flex min-w-0 items-center gap-3 rounded-lg border border-[var(--border)]/60 bg-[var(--surface-2)] px-3 py-2.5"
      data-testid={`match-squad-player-${player.personId}`}
    >
      <div className="shrink-0 scale-[0.72] origin-left">
        <AdminAvatar name={player.displayName} size="sm" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-medium text-[var(--foreground)]">{player.displayName}</p>
        <div
          className="flex min-w-0 flex-wrap items-center gap-1.5"
          data-testid={`match-squad-availability-${player.personId}`}
        >
          <MatchAvailabilityStatusBadge
            label={player.availabilityLabel}
            tone={player.presentationTone}
            icon={player.presentationIcon}
          />
          {player.availabilityConflict ? (
            <MatchAvailabilityConflictBadge testId={`match-squad-conflict-${player.personId}`} />
          ) : null}
        </div>
        <p className="truncate text-[10px] text-[var(--muted)]">
          {player.shirtNumber != null ? `#${player.shirtNumber}` : "Kader"}
          {player.rosterIneligibleLabel ? ` · ${player.rosterIneligibleLabel}` : ""}
          {player.responseProvenanceLabel ? ` · ${player.responseProvenanceLabel}` : ""}
        </p>
      </div>
      {canManageAvailability ? (
        <MatchAvailabilityTrainerRecordMenu
          matchId={matchId}
          personId={player.personId}
          displayName={player.displayName}
          disabled={disabled}
          onRecorded={onAvailabilityRecorded}
        />
      ) : null}
      {action === "add" && !player.canSelect && player.availability === "UNAVAILABLE" ? (
        <span
          className="inline-flex shrink-0 items-center rounded-md border border-[var(--sce-danger-border)] bg-[var(--sce-danger-light)] px-2.5 py-1.5 text-xs font-semibold text-[var(--sce-danger)]"
          data-testid={`match-squad-unavailable-action-${player.personId}`}
        >
          Nicht verfügbar
        </span>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={onAction}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-3)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-4)] disabled:opacity-50"
          data-testid={
            action === "add" ? `match-squad-add-${player.personId}` : `match-squad-remove-${player.personId}`
          }
          aria-label={
            action === "remove"
              ? `${player.displayName} aus dem Aufgebot entfernen`
              : `${player.displayName} aufbieten`
          }
        >
          {action === "add" ? (
            <>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Aufbieten
            </>
          ) : (
            <>
              <span className="sr-only">Aufgeboten — </span>
              <Minus className="h-3.5 w-3.5" aria-hidden />
              Entfernen
            </>
          )}
        </button>
      )}
    </li>
  );
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
        <div className="space-y-6">
          <section aria-labelledby="match-squad-selected-heading">
            <h3
              id="match-squad-selected-heading"
              className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
            >
              Aufgeboten · {filteredSelected.length} Spieler
              {availabilityFilter !== "ALL" ? ` (gefiltert)` : ""}
            </h3>
            {filteredSelected.length === 0 ? (
              <p className="text-sm text-[var(--muted)]" data-testid="match-squad-empty-selected">
                Noch keine Spieler aufgeboten.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {filteredSelected.map((player) => (
                  <PlayerCard
                    key={player.personId}
                    player={player}
                    action="remove"
                    disabled={!canMutate || !player.canRemove}
                    onAction={() => togglePerson(player.personId, false)}
                    matchId={matchId}
                    canManageAvailability={canManageAvailability}
                    onAvailabilityRecorded={() => void load()}
                  />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="match-squad-remaining-heading">
            <h3
              id="match-squad-remaining-heading"
              className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
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
              <ul className="grid gap-2 sm:grid-cols-2">
                {filteredRemaining.map((player) => (
                  <PlayerCard
                    key={player.personId}
                    player={player}
                    action="add"
                    disabled={!canMutate || !player.canSelect}
                    onAction={() => togglePerson(player.personId, true)}
                    matchId={matchId}
                    canManageAvailability={canManageAvailability}
                    onAvailabilityRecorded={() => void load()}
                  />
                ))}
              </ul>
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
