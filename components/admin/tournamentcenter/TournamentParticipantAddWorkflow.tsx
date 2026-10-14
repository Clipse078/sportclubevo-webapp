"use client";

/**
 * Legacy combined participant-add surface (record editor).
 * Tournament Composer uses dedicated section components (R4) with direct selector actions.
 */

import { useMemo, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import type { TeamPickerOption } from "@/components/admin/shared/TeamSearchablePicker";
import type { ExternalClubPickerResult } from "./ExternalClubPicker";
import { SceClubTeamSelectorDialog } from "@/components/sce/club-team-selector/SceClubTeamSelectorDialog";
import type { SceSelectableTeam } from "@/lib/sce/club-team-selector/types";

type Props = {
  availableTeams: TeamPickerOption[];
  teamsLoading?: boolean;
  tenantLogoUrl?: string | null;
  tenantClubName?: string;
  onAddTeam: (teamId: string) => void;
  onAddExternalClub: (club: ExternalClubPickerResult) => void;
  onAddManual: (label: string) => void;
  pending?: boolean;
  teamSelectTestId?: string;
  externalClubTestId?: string;
  manualInputTestId?: string;
  manualButtonTestId?: string;
  noWritableTeamsMessage?: React.ReactNode;
  triggerVariant?: "lobby-tile" | "standalone";
  lobbyDensity?: unknown;
};

export default function TournamentParticipantAddWorkflow({
  availableTeams,
  teamsLoading = false,
  tenantLogoUrl = null,
  tenantClubName = "",
  onAddTeam,
  onAddExternalClub,
  onAddManual,
  pending = false,
  teamSelectTestId = "tournament-participant-add-team",
  externalClubTestId = "tournament-participant-add-external-club-search",
  manualInputTestId = "tournament-participant-manual-input",
  manualButtonTestId = "tournament-participant-add-manual-button",
  noWritableTeamsMessage,
}: Props) {
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [clubDialogOpen, setClubDialogOpen] = useState(false);
  const [manualLabel, setManualLabel] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const teamTriggerRef = useRef<HTMLButtonElement>(null);
  const clubTriggerRef = useRef<HTMLButtonElement>(null);

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

  return (
    <div data-testid="tournament-participant-add-workflow" className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          ref={teamTriggerRef}
          type="button"
          onClick={() => setTeamDialogOpen(true)}
          disabled={pending || teamsLoading || availableTeams.length === 0}
          data-testid={`${teamSelectTestId}-menu-option`}
          className="fca-button-secondary h-9"
        >
          {teamsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Eigenes Team
        </button>
        <button
          ref={clubTriggerRef}
          type="button"
          onClick={() => setClubDialogOpen(true)}
          disabled={pending}
          data-testid={`${externalClubTestId}-menu-option`}
          className="fca-button-secondary h-9"
        >
          <Plus className="h-4 w-4" />
          Externer Verein
        </button>
        <button
          type="button"
          onClick={() => setShowManualEntry(true)}
          disabled={pending}
          data-testid="tournament-participant-manual-menu-option"
          className="fca-button-secondary h-9"
        >
          <Plus className="h-4 w-4" />
          Manuell
        </button>
      </div>

      {noWritableTeamsMessage ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">{noWritableTeamsMessage}</div>
      ) : null}

      {showManualEntry ? (
        <div className="grid gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <input
            type="text"
            value={manualLabel}
            onChange={(e) => setManualLabel(e.target.value)}
            placeholder="z. B. unbekanntes Gastteam"
            disabled={pending}
            data-testid={manualInputTestId}
            className="fca-input h-9"
          />
          <button
            type="button"
            onClick={() => {
              const label = manualLabel.trim();
              if (!label) return;
              onAddManual(label);
              setManualLabel("");
              setShowManualEntry(false);
            }}
            disabled={!manualLabel.trim() || pending}
            data-testid={manualButtonTestId}
            className="fca-button-secondary h-9"
          >
            Hinzufügen
          </button>
        </div>
      ) : null}

      <SceClubTeamSelectorDialog
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
        mode="TEAM_ONLY"
        tenantClub={{ clubName: tenantClubName, logoUrl: tenantLogoUrl }}
        tenantTeams={tenantSelectableTeams}
        filters={{ allowedTeamIds: availableTeams.map((t) => t.id), activeOnly: true }}
        onConfirm={({ team }) => {
          if (team) onAddTeam(team.id);
          setTeamDialogOpen(false);
          teamTriggerRef.current?.focus();
        }}
        testIdPrefix="tournament-participant-team-selector"
        returnFocusRef={teamTriggerRef}
      />

      <SceClubTeamSelectorDialog
        open={clubDialogOpen}
        onOpenChange={setClubDialogOpen}
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
          setClubDialogOpen(false);
          clubTriggerRef.current?.focus();
        }}
        testIdPrefix="tournament-participant-club-selector"
        returnFocusRef={clubTriggerRef}
      />
    </div>
  );
}
