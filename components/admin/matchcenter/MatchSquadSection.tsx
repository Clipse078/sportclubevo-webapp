"use client";

import { useCallback, useEffect, useState } from "react";
import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import PlanningEditorParticipantsSection from "@/components/admin/shared/planning-editor/PlanningEditorParticipantsSection";
import { Loader2, Minus, Plus } from "lucide-react";
import MatchAvailabilityStatusBadge, {
  MatchAvailabilityConflictBadge,
} from "@/components/admin/matchcenter/MatchAvailabilityStatusBadge";
import MatchSquadCountsSummary from "@/components/admin/matchcenter/MatchSquadCountsSummary";
import { matchSquadRemainingEmptyMessage } from "@/lib/match-squad/remaining-empty-copy";
import type { MatchSquadPlayerPresentation } from "@/lib/match-squad/types";

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
};

type Props = {
  matchId: string;
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

function PlayerCard({
  player,
  action,
  onAction,
  disabled,
}: {
  player: MatchSquadPlayerPresentation;
  action: "add" | "remove";
  onAction: () => void;
  disabled: boolean;
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
        </p>
      </div>
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

export default function MatchSquadSection({ matchId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SquadPayload | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [version, setVersion] = useState<string>("");

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

      {!loading && data?.counts ? <MatchSquadCountsSummary counts={data.counts} /> : null}

      {!loading && data ? (
        <div className="space-y-6">
          <section aria-labelledby="match-squad-selected-heading">
            <h3
              id="match-squad-selected-heading"
              className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
            >
              Aufgeboten · {optimisticSelected.length} Spieler
            </h3>
            {optimisticSelected.length === 0 ? (
              <p className="text-sm text-[var(--muted)]" data-testid="match-squad-empty-selected">
                Noch keine Spieler aufgeboten.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {optimisticSelected.map((player) => (
                  <PlayerCard
                    key={player.personId}
                    player={player}
                    action="remove"
                    disabled={!canMutate || !player.canRemove}
                    onAction={() => togglePerson(player.personId, false)}
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
              Weitere Kaderspieler · {optimisticRemaining.length} Spieler
            </h3>
            {optimisticRemaining.length === 0 ? (
              <p
                className="text-sm text-[var(--muted)]"
                data-testid="match-squad-empty-remaining"
                data-roster-total={data.counts?.rosterTotal ?? 0}
              >
                {matchSquadRemainingEmptyMessage(data.counts?.rosterTotal ?? 0)}
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {optimisticRemaining.map((player) => (
                  <PlayerCard
                    key={player.personId}
                    player={player}
                    action="add"
                    disabled={!canMutate || !player.canSelect}
                    onAction={() => togglePerson(player.personId, true)}
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
