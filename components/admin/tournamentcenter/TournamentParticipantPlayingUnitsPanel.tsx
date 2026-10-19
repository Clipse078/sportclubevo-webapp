"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { TournamentParticipantPlayingUnitDto } from "@/lib/tournaments/types";
import { cn } from "@/lib/cn";

const IMPLICIT_FULL_PLAYING_UNIT_ID_PREFIX = "implicit-full:" as const;

function buildImplicitFullPlayingUnitId(participantId: string): string {
  return `${IMPLICIT_FULL_PLAYING_UNIT_ID_PREFIX}${participantId}`;
}

type Props = {
  tournamentId: string;
  participantId: string;
  participantDisplayName: string;
  canManage: boolean;
};

type PlayingUnitsPayload = {
  persistedUnits?: TournamentParticipantPlayingUnitDto[];
  effectiveUnits?: TournamentParticipantPlayingUnitDto[];
  usesImplicitFullTeam?: boolean;
  error?: string;
  errorKind?: string;
};

type SplitResponse = {
  units?: TournamentParticipantPlayingUnitDto[];
  error?: string;
  errorKind?: string;
};

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default function TournamentParticipantPlayingUnitsPanel({
  tournamentId,
  participantId,
  participantDisplayName,
  canManage,
}: Props) {
  const [persistedUnits, setPersistedUnits] = useState<TournamentParticipantPlayingUnitDto[]>([]);
  const [effectiveUnits, setEffectiveUnits] = useState<TournamentParticipantPlayingUnitDto[]>([]);
  const [usesImplicitFullTeam, setUsesImplicitFullTeam] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [nameEdits, setNameEdits] = useState<Record<string, string>>({});
  const hasLoadedOnce = useRef(false);

  const implicitFullFallback = useMemo((): TournamentParticipantPlayingUnitDto[] => {
    return [
      {
        id: buildImplicitFullPlayingUnitId(participantId),
        tournamentParticipantId: participantId,
        displayName: participantDisplayName,
        mode: "FULL",
        capacityPartitionKey: null,
        displayOrder: 0,
        isPersisted: false,
      },
    ];
  }, [participantDisplayName, participantId]);

  const applyPayload = useCallback((data: PlayingUnitsPayload | null) => {
    const persisted = data?.persistedUnits ?? [];
    const effective = data?.effectiveUnits ?? [];
    setPersistedUnits(persisted);
    setEffectiveUnits(
      effective.length > 0 || persisted.length === 0 ? effective : implicitFullFallback,
    );
    setUsesImplicitFullTeam(persisted.length === 0);
  }, [implicitFullFallback]);

  const loadUnits = useCallback(
    async (options?: { background?: boolean }) => {
      const background = options?.background === true;
      if (background) {
        setRefreshing(true);
      } else if (!hasLoadedOnce.current) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
      setLoadError(null);
      try {
        const res = await fetch(
          `/api/tournaments/${tournamentId}/participants/${participantId}/playing-units`,
          { credentials: "same-origin" },
        );
        const data = await readJson<PlayingUnitsPayload>(res);
        if (!res.ok) {
          throw new Error(data?.error ?? "Spielteams konnten nicht geladen werden.");
        }
        applyPayload(data);
        hasLoadedOnce.current = true;
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Spielteams konnten nicht geladen werden.");
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [applyPayload, participantId, tournamentId],
  );

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  const unitsToRender = usesImplicitFullTeam
    ? effectiveUnits.length > 0
      ? effectiveUnits
      : implicitFullFallback
    : persistedUnits;

  const runMutation = async (
    request: () => Promise<void>,
    fallbackMessage: string,
  ): Promise<void> => {
    if (!canManage || isMutating) return;
    setIsMutating(true);
    setMutationError(null);
    try {
      await request();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : fallbackMessage);
    } finally {
      setIsMutating(false);
    }
  };

  const splitTeam = () => {
    void runMutation(async () => {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/participants/${participantId}/playing-units`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "split-default",
            baseDisplayName: participantDisplayName,
          }),
        },
      );
      const data = await readJson<SplitResponse>(res);
      if (!res.ok) {
        throw new Error(data?.error ?? "Spielteams konnten nicht erstellt werden.");
      }
      const created = data?.units ?? [];
      if (created.length > 0) {
        setPersistedUnits(created);
        setEffectiveUnits(created);
        setUsesImplicitFullTeam(false);
        setNameEdits({});
      }
      await loadUnits({ background: true });
    }, "Spielteams konnten nicht erstellt werden.");
  };

  const addSubunit = () => {
    void runMutation(async () => {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/participants/${participantId}/playing-units`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: `${participantDisplayName}-neu`,
            mode: "SUBUNIT",
          }),
        },
      );
      const data = await readJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data?.error ?? "Spielteam konnte nicht hinzugefügt werden.");
      }
      await loadUnits({ background: true });
    }, "Spielteam konnte nicht hinzugefügt werden.");
  };

  const saveName = (unitId: string, displayName: string) => {
    void runMutation(async () => {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/participants/${participantId}/playing-units/${unitId}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName }),
        },
      );
      const data = await readJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data?.error ?? "Name konnte nicht gespeichert werden.");
      }
      await loadUnits({ background: true });
    }, "Name konnte nicht gespeichert werden.");
  };

  const removeUnit = (unitId: string) => {
    if (!window.confirm("Spielteam wirklich entfernen?")) return;
    void runMutation(async () => {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/participants/${participantId}/playing-units/${unitId}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      const data = await readJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data?.error ?? "Spielteam konnte nicht entfernt werden.");
      }
      await loadUnits({ background: true });
    }, "Spielteam konnte nicht entfernt werden.");
  };

  if (initialLoading) {
    return (
      <p className="text-xs text-[var(--muted)]" data-testid="playing-units-loading">
        Spielteams werden geladen…
      </p>
    );
  }

  const showAdvanced = canManage || persistedUnits.length > 0;

  if (!showAdvanced) {
    return null;
  }

  const splitPending = isMutating && usesImplicitFullTeam;

  return (
    <div
      className={cn("mt-2 space-y-2")}
      data-testid={`tournament-participant-${participantId}-playing-units`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Spielteams
          {refreshing ? (
            <span className="ml-2 font-normal normal-case text-[var(--text-2)]">(aktualisiere…)</span>
          ) : null}
        </p>
        {canManage && usesImplicitFullTeam ? (
          <button
            type="button"
            onClick={splitTeam}
            disabled={isMutating}
            aria-busy={splitPending}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] disabled:opacity-50"
            data-testid={`tournament-participant-${participantId}-split-team`}
          >
            {splitPending ? "Team wird aufgeteilt…" : "Team aufteilen"}
          </button>
        ) : null}
        {canManage && !usesImplicitFullTeam ? (
          <button
            type="button"
            onClick={addSubunit}
            disabled={isMutating}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] disabled:opacity-50"
            data-testid={`tournament-participant-${participantId}-add-spielteam`}
          >
            <Plus className="h-3 w-3" aria-hidden />
            Spielteam hinzufügen
          </button>
        ) : null}
      </div>

      {loadError ? (
        <p className="text-xs text-rose-600" role="alert" data-testid="playing-units-load-error">
          {loadError}
        </p>
      ) : null}

      {mutationError ? (
        <p
          className="text-xs text-rose-600"
          role="alert"
          data-testid="playing-units-mutation-error"
        >
          {mutationError}
        </p>
      ) : null}

      <ul className="space-y-1.5" aria-label="Spielteams">
        {unitsToRender.map((unit) => {
          const modeLabel = unit.mode === "FULL" ? "Ganzes Team" : "Teilteam";
          const editable = canManage && unit.isPersisted;
          return (
            <li
              key={unit.id}
              className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5"
              data-testid={`playing-unit-row-${unit.id}`}
            >
              {editable ? (
                <input
                  type="text"
                  value={nameEdits[unit.id] ?? unit.displayName}
                  onChange={(e) => setNameEdits((prev) => ({ ...prev, [unit.id]: e.target.value }))}
                  onBlur={(e) => {
                    if (e.target.value.trim() === unit.displayName) return;
                    saveName(unit.id, e.target.value);
                  }}
                  aria-label={`Name für ${modeLabel}`}
                  className="fca-input min-w-0 flex-1 py-1 text-sm"
                  disabled={isMutating}
                />
              ) : (
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
                  {unit.displayName}
                </span>
              )}
              <span className="shrink-0 rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-2)]">
                {modeLabel}
              </span>
              {editable ? (
                <button
                  type="button"
                  onClick={() => removeUnit(unit.id)}
                  disabled={isMutating}
                  aria-label={`${unit.displayName} entfernen`}
                  className="shrink-0 rounded p-1 text-[var(--muted)] hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {usesImplicitFullTeam && !canManage ? (
        <p className="text-[11px] text-[var(--text-2)]">Standard: ganzes Team am Turnier.</p>
      ) : null}
    </div>
  );
}
