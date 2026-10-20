"use client";

import { Plus, Trash2 } from "lucide-react";
import type { TournamentComposerPlayingUnitDraft } from "@/lib/tournaments/composer/tournament-composer-playing-units";
import {
  resolveEffectiveComposerPlayingUnits,
  usesImplicitComposerFullTeam,
} from "@/lib/tournaments/composer/tournament-composer-playing-units";

type Props = {
  participantLocalId: string;
  participantDisplayName: string;
  units: TournamentComposerPlayingUnitDraft[] | undefined;
  onSplit: () => void;
  onAddSubunit: () => void;
  onRename: (unitLocalId: string, displayName: string) => void;
  onRemove: (unitLocalId: string) => void;
};

export default function TournamentComposerPlayingUnitsPanel({
  participantLocalId,
  participantDisplayName,
  units,
  onSplit,
  onAddSubunit,
  onRename,
  onRemove,
}: Props) {
  const implicit = usesImplicitComposerFullTeam(units);
  const effective = resolveEffectiveComposerPlayingUnits({
    participantLocalId,
    participantDisplayName,
    persistedUnits: units,
  });

  return (
    <div
      className="mt-2 space-y-1.5 border-t border-[var(--border)]/60 pt-2"
      data-testid={`tournament-composer-playing-units-${participantLocalId}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Spielteams
        </span>
        {implicit ? (
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium hover:bg-[var(--surface-2)]"
            onClick={onSplit}
            data-testid={`tournament-composer-split-team-${participantLocalId}`}
          >
            Team aufteilen
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-0.5 rounded-md border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium hover:bg-[var(--surface-2)]"
            onClick={onAddSubunit}
            data-testid={`tournament-composer-add-spielteam-${participantLocalId}`}
          >
            <Plus className="h-3 w-3" aria-hidden />
            Spielteam
          </button>
        )}
      </div>
      <ul className="space-y-1">
        {effective.map((unit) => {
          const editable = !implicit && !unit.localId.startsWith("implicit-full:");
          return (
            <li
              key={unit.localId}
              className="flex items-center gap-1 rounded border border-[var(--border)]/70 bg-[var(--surface)] px-1.5 py-1"
              data-testid={`tournament-composer-playing-unit-${unit.localId}`}
            >
              {editable ? (
                <input
                  type="text"
                  className="fca-input min-w-0 flex-1 py-0.5 text-xs"
                  value={unit.displayName}
                  onChange={(e) => onRename(unit.localId, e.target.value)}
                  aria-label="Spielteam-Name"
                />
              ) : (
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{unit.displayName}</span>
              )}
              {editable ? (
                <button
                  type="button"
                  aria-label="Spielteam entfernen"
                  className="shrink-0 rounded p-0.5 text-[var(--muted)] hover:text-rose-600"
                  onClick={() => onRemove(unit.localId)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {implicit ? (
        <p className="text-[10px] text-[var(--text-2)]">Standard: ganzes Team am Turnier.</p>
      ) : null}
    </div>
  );
}
