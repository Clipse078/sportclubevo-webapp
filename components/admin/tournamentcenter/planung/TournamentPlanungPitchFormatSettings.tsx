"use client";

import { useState } from "react";
import type { TournamentPlanungPitchColumn } from "@/lib/tournaments/planung/types";
import TournamentComposerPitchPlayingFormatField from "@/components/admin/tournamentcenter/composer/TournamentComposerPitchPlayingFormatField";

type Props = {
  tournamentId: string;
  pitches: readonly TournamentPlanungPitchColumn[];
  canManage: boolean;
  onSaved: (viewModel: import("@/lib/tournaments/planung/types").TournamentPlanungViewModel) => void;
  onError: (message: string) => void;
};

export default function TournamentPlanungPitchFormatSettings({
  tournamentId,
  pitches,
  canManage,
  onSaved,
  onError,
}: Props) {
  const [pendingPitchId, setPendingPitchId] = useState<string | null>(null);

  if (pitches.length === 0) return null;

  const saveFormat = async (pitchId: string, playersPerSide: number | null) => {
    if (!canManage) return;
    setPendingPitchId(pitchId);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/planung/pitches/${pitchId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playersPerSide }),
        },
      );
      const data = (await res.json()) as { viewModel?: import("@/lib/tournaments/planung/types").TournamentPlanungViewModel; error?: string };
      if (!res.ok) {
        onError(data.error ?? "Spielform konnte nicht gespeichert werden.");
        return;
      }
      if (data.viewModel) {
        onSaved(data.viewModel);
      }
    } catch {
      onError("Spielform konnte nicht gespeichert werden.");
    } finally {
      setPendingPitchId(null);
    }
  };

  return (
    <div className="space-y-3" data-testid="planung-pitch-format-settings">
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Turnierfelder</h3>
        <p className="mt-1 text-sm text-[var(--text-2)]">
          Optional kannst du für jedes Turnierfeld eine Spielform festlegen. Dies ändert den Spielplan nicht.
        </p>
      </div>
      <ul className="space-y-3">
        {pitches.map((pitch) => (
          <li
            key={pitch.pitchId}
            className="flex flex-col gap-2 rounded-lg border border-[var(--border)]/70 bg-[var(--surface)]/30 p-3 sm:flex-row sm:items-end"
          >
            <p className="min-w-[5rem] text-sm font-medium text-[var(--foreground)]">{pitch.label}</p>
            <TournamentComposerPitchPlayingFormatField
              id={`planung-pitch-format-${pitch.pitchId}`}
              testId={`planung-pitch-format-${pitch.pitchId}`}
              playersPerSide={pitch.playersPerSide}
              disabled={!canManage}
              onChange={(value) => {
                if (value === pitch.playersPerSide) return;
                void saveFormat(pitch.pitchId, value);
              }}
            />
            {pendingPitchId === pitch.pitchId ? (
              <p className="text-xs text-[var(--muted)] sm:ml-auto">Speichern…</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
