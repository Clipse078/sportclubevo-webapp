"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  resolveTournamentLobbyGridDensity,
  type TournamentLobbyParticipantIdentity,
} from "@/lib/tournaments/tournament-participant-presentation";
import { SceTournamentParticipantTile } from "./SceTournamentParticipantTile";

export type SceTournamentParticipantLobbyProps = {
  participants: TournamentLobbyParticipantIdentity[];
  onRemoveParticipant: (localId: string) => void;
  addParticipantSlot: ReactNode;
  density?: "auto" | "spacious" | "balanced" | "dense";
  reviewMode?: boolean;
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

export function SceTournamentParticipantLobby({
  participants,
  onRemoveParticipant,
  addParticipantSlot,
  density = "auto",
  reviewMode = false,
  testId = "tournament-participant-lobby",
}: SceTournamentParticipantLobbyProps) {
  const resolvedDensity =
    density === "auto" ? resolveTournamentLobbyGridDensity(participants.length) : density;

  return (
    <section data-testid={testId} aria-labelledby={`${testId}-heading`} className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3
          id={`${testId}-heading`}
          className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]"
        >
          {reviewMode ? "Teilnehmer" : "Teilnehmende Teams"}
        </h3>
        <p className="text-sm text-[var(--text-2)]" data-testid={`${testId}-count`}>
          {participants.length} Teilnehmer
        </p>
      </div>
      <div className={cn(gridClassForDensity(resolvedDensity))}>
        {participants.map((model) => (
          <SceTournamentParticipantTile
            key={model.localId}
            variant="participant"
            model={model}
            density={resolvedDensity}
            onRemove={onRemoveParticipant}
            readOnly={reviewMode}
            testId={`tournament-participant-tile-${model.localId}`}
          />
        ))}
        {!reviewMode ? addParticipantSlot : null}
      </div>
    </section>
  );
}
