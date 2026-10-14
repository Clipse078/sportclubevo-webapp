"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import type { TeamPickerOption } from "@/components/admin/shared/TeamSearchablePicker";
import { SceClubTeamSelectorDialog } from "@/components/sce/club-team-selector/SceClubTeamSelectorDialog";
import type { SceSelectableTeam } from "@/lib/sce/club-team-selector/types";
import { SceTournamentParticipantTile } from "@/components/sce/tournament/SceTournamentParticipantTile";
import type { TournamentLobbyParticipantIdentity } from "@/lib/tournaments/tournament-participant-presentation";
import { resolveTournamentLobbyGridDensity } from "@/lib/tournaments/tournament-participant-presentation";
import { cn } from "@/lib/cn";

type Props = {
  identities: TournamentLobbyParticipantIdentity[];
  availableTeams: TeamPickerOption[];
  teamsLoading?: boolean;
  tenantLogoUrl: string | null;
  tenantClubName: string;
  onAddTeam: (teamId: string) => void;
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

export default function TournamentOwnTeamsSection({
  identities,
  availableTeams,
  teamsLoading = false,
  tenantLogoUrl,
  tenantClubName,
  onAddTeam,
  onRemoveParticipant,
  pending = false,
  testId = "tournament-own-teams-section",
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const tenantSelectableTeams = useMemo((): SceSelectableTeam[] => {
    return availableTeams.map((team) => ({
      id: team.id,
      clubId: "tenant",
      name: team.name,
      shortName: team.name,
      categoryLabel: [team.ageGroup, team.genderGroup].filter(Boolean).join(" / ") || null,
      ageGroup: team.ageGroup ?? null,
      genderGroup: team.genderGroup ?? null,
    }));
  }, [availableTeams]);

  const density = resolveTournamentLobbyGridDensity(identities.length);
  const addDisabled = pending || teamsLoading || availableTeams.length === 0;
  const addLabel = identities.length === 0 ? "Eigenes Team hinzufügen" : "Weiteres eigenes Team";

  return (
    <section className="space-y-3" data-testid={testId} aria-labelledby={`${testId}-heading`}>
      <h3
        id={`${testId}-heading`}
        className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]"
      >
        Eigene Teams
      </h3>
      <div className={cn(gridClassForDensity(density))}>
        {identities.map((model) => (
          <SceTournamentParticipantTile
            key={model.localId}
            variant="participant"
            model={model}
            density={density}
            onRemove={onRemoveParticipant}
            testId={`tournament-own-team-tile-${model.localId}`}
          />
        ))}
      </div>
      <button
        ref={addButtonRef}
        type="button"
        className="fca-button-secondary h-9"
        disabled={addDisabled}
        onClick={() => setDialogOpen(true)}
        data-testid="tournament-own-team-add"
      >
        {pending || teamsLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Plus className="h-4 w-4" aria-hidden />
        )}
        {addLabel}
      </button>

      <SceClubTeamSelectorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="TEAM_ONLY"
        tenantClub={{ clubName: tenantClubName, logoUrl: tenantLogoUrl }}
        tenantTeams={tenantSelectableTeams}
        filters={{ allowedTeamIds: availableTeams.map((t) => t.id), activeOnly: true }}
        onConfirm={({ team }) => {
          if (team) onAddTeam(team.id);
          setDialogOpen(false);
          addButtonRef.current?.focus();
        }}
        testIdPrefix="tournament-participant-team-selector"
        returnFocusRef={addButtonRef}
      />
    </section>
  );
}
