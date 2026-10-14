"use client";

import { useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import type { ExternalClubPickerResult } from "./ExternalClubPicker";
import { SceClubTeamSelectorDialog } from "@/components/sce/club-team-selector/SceClubTeamSelectorDialog";
import { SceTournamentParticipantTile } from "@/components/sce/tournament/SceTournamentParticipantTile";
import type { TournamentLobbyParticipantIdentity } from "@/lib/tournaments/tournament-participant-presentation";
import { resolveTournamentLobbyGridDensity } from "@/lib/tournaments/tournament-participant-presentation";
import { cn } from "@/lib/cn";

type Props = {
  identities: TournamentLobbyParticipantIdentity[];
  onAddExternalClub: (club: ExternalClubPickerResult) => void;
  onRemoveParticipant: (localId: string) => void;
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

export default function TournamentExternalClubsSection({
  identities,
  onAddExternalClub,
  onRemoveParticipant,
  pending = false,
  testId = "tournament-external-clubs-section",
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const density = resolveTournamentLobbyGridDensity(identities.length);
  const addLabel = identities.length === 0 ? "Verein hinzufügen" : "Weiteren Verein hinzufügen";

  return (
    <section className="space-y-3" data-testid={testId} aria-labelledby={`${testId}-heading`}>
      <h3
        id={`${testId}-heading`}
        className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]"
      >
        Teilnehmende Vereine
      </h3>
      <div className={cn(gridClassForDensity(density))}>
        {identities.map((model) => (
          <SceTournamentParticipantTile
            key={model.localId}
            variant="participant"
            model={model}
            density={density}
            onRemove={onRemoveParticipant}
            testId={`tournament-external-club-tile-${model.localId}`}
          />
        ))}
      </div>
      <button
        ref={addButtonRef}
        type="button"
        className="fca-button-secondary h-9"
        disabled={pending}
        onClick={() => setDialogOpen(true)}
        data-testid="tournament-external-club-add"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
        {addLabel}
      </button>

      <SceClubTeamSelectorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="CLUB_ONLY"
        filters={{ activeOnly: true, externalClubsOnly: true }}
        onConfirm={({ club }) => {
          if (club) {
            onAddExternalClub({
              id: club.id,
              name: club.name,
              shortName: club.shortName,
              logoUrl: club.logoUrl,
            });
          }
          setDialogOpen(false);
          addButtonRef.current?.focus();
        }}
        testIdPrefix="tournament-participant-club-selector"
        returnFocusRef={addButtonRef}
      />
    </section>
  );
}
