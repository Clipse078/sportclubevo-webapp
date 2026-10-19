"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { TournamentParticipantPlayingUnitDto } from "@/lib/tournaments/types";
import { cn } from "@/lib/cn";

type Props = {
  tournamentId: string;
  participantId: string;
  participantDisplayName: string;
  canManage: boolean;
};

export default function TournamentParticipantPlayingUnitsPanel({
  tournamentId,
  participantId,
  participantDisplayName,
  canManage,
}: Props) {
  const [persistedUnits, setPersistedUnits] = useState<TournamentParticipantPlayingUnitDto[]>([]);
  const [effectiveUnits, setEffectiveUnits] = useState<TournamentParticipantPlayingUnitDto[]>([]);
  const [usesImplicitFullTeam, setUsesImplicitFullTeam] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameEdits, setNameEdits] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const loadUnits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/participants/${participantId}/playing-units`,
      );
      const data = (await res.json().catch(() => null)) as {
        persistedUnits?: TournamentParticipantPlayingUnitDto[];
        effectiveUnits?: TournamentParticipantPlayingUnitDto[];
        usesImplicitFullTeam?: boolean;
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Spielteams konnten nicht geladen werden.");
      }
      setPersistedUnits(data?.persistedUnits ?? []);
      setEffectiveUnits(data?.effectiveUnits ?? []);
      setUsesImplicitFullTeam(Boolean(data?.usesImplicitFullTeam));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Spielteams konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [tournamentId, participantId]);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  const splitTeam = () => {
    if (!canManage) return;
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/tournaments/${tournamentId}/participants/${participantId}/playing-units`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "split-default",
              baseDisplayName: participantDisplayName,
            }),
          },
        );
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(data?.error ?? "Team konnte nicht aufgeteilt werden.");
        }
        await loadUnits();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Team konnte nicht aufgeteilt werden.");
      }
    });
  };

  const addSubunit = () => {
    if (!canManage) return;
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/tournaments/${tournamentId}/participants/${participantId}/playing-units`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              displayName: `${participantDisplayName}-neu`,
              mode: "SUBUNIT",
            }),
          },
        );
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(data?.error ?? "Spielteam konnte nicht hinzugefügt werden.");
        }
        await loadUnits();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Spielteam konnte nicht hinzugefügt werden.");
      }
    });
  };

  const saveName = (unitId: string, displayName: string) => {
    if (!canManage) return;
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/tournaments/${tournamentId}/participants/${participantId}/playing-units/${unitId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayName }),
          },
        );
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(data?.error ?? "Name konnte nicht gespeichert werden.");
        }
        await loadUnits();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Name konnte nicht gespeichert werden.");
      }
    });
  };

  const removeUnit = (unitId: string) => {
    if (!canManage) return;
    if (!window.confirm("Spielteam wirklich entfernen?")) return;
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/tournaments/${tournamentId}/participants/${participantId}/playing-units/${unitId}`,
          { method: "DELETE" },
        );
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(data?.error ?? "Spielteam konnte nicht entfernt werden.");
        }
        await loadUnits();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Spielteam konnte nicht entfernt werden.");
      }
    });
  };

  if (loading) {
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

  return (
    <div
      className={cn("mt-2 space-y-2")}
      data-testid={`tournament-participant-${participantId}-playing-units`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Spielteams
        </p>
        {canManage && usesImplicitFullTeam ? (
          <button
            type="button"
            onClick={splitTeam}
            disabled={isPending}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] disabled:opacity-50"
            data-testid={`tournament-participant-${participantId}-split-team`}
          >
            Team aufteilen
          </button>
        ) : null}
        {canManage && !usesImplicitFullTeam ? (
          <button
            type="button"
            onClick={addSubunit}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] disabled:opacity-50"
            data-testid={`tournament-participant-${participantId}-add-spielteam`}
          >
            <Plus className="h-3 w-3" aria-hidden />
            Spielteam hinzufügen
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="space-y-1.5" aria-label="Spielteams">
        {(usesImplicitFullTeam ? effectiveUnits : persistedUnits).map((unit) => {
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
                  disabled={isPending}
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
                  disabled={isPending}
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
