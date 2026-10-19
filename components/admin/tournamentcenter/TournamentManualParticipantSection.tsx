"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { SceTournamentParticipantTile } from "@/components/sce/tournament/SceTournamentParticipantTile";
import type { TournamentLobbyParticipantIdentity } from "@/lib/tournaments/tournament-participant-presentation";
import { resolveTournamentLobbyGridDensity } from "@/lib/tournaments/tournament-participant-presentation";
import { cn } from "@/lib/cn";

type Props = {
  identities: TournamentLobbyParticipantIdentity[];
  onAddManual: (label: string) => void;
  onRemoveParticipant: (localId: string) => void;
  renderParticipantFooter?: (localId: string) => ReactNode;
  pending?: boolean;
  testId?: string;
};

function gridClassForDensity(density: ReturnType<typeof resolveTournamentLobbyGridDensity>): string {
  if (density === "spacious") {
    return "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";
  }
  if (density === "balanced") {
    return "grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4";
  }
  return "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
}

export default function TournamentManualParticipantSection({
  identities,
  onAddManual,
  onRemoveParticipant,
  renderParticipantFooter,
  pending = false,
  testId = "tournament-manual-participants-section",
}: Props) {
  const [manualLabel, setManualLabel] = useState("");
  const [showEntry, setShowEntry] = useState(false);

  const density = resolveTournamentLobbyGridDensity(identities.length);

  return (
    <section className="space-y-3" data-testid={testId} aria-labelledby={`${testId}-heading`}>
      <h3
        id={`${testId}-heading`}
        className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]"
      >
        Manuelle Teilnehmer
      </h3>
      {identities.length > 0 ? (
        <div className={cn(gridClassForDensity(density))}>
          {identities.map((model) => (
            <SceTournamentParticipantTile
              key={model.localId}
              variant="participant"
              model={model}
              density={density}
              onRemove={onRemoveParticipant}
              footer={renderParticipantFooter?.(model.localId)}
              testId={`tournament-manual-participant-tile-${model.localId}`}
            />
          ))}
        </div>
      ) : null}
      {showEntry ? (
        <div className="grid gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <input
            type="text"
            value={manualLabel}
            onChange={(e) => setManualLabel(e.target.value)}
            placeholder="z. B. unbekanntes Gastteam"
            disabled={pending}
            data-testid="tournament-participant-manual-input"
            className="fca-input h-9"
          />
          <button
            type="button"
            onClick={() => {
              const label = manualLabel.trim();
              if (!label) return;
              onAddManual(label);
              setManualLabel("");
              setShowEntry(false);
            }}
            disabled={!manualLabel.trim() || pending}
            data-testid="tournament-participant-add-manual-button"
            className="fca-button-secondary h-9"
          >
            Hinzufügen
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="fca-button-secondary h-9"
          disabled={pending}
          onClick={() => setShowEntry(true)}
          data-testid="tournament-manual-participant-add"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Manuellen Teilnehmer hinzufügen
        </button>
      )}
    </section>
  );
}
