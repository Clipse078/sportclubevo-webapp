"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import type { TeamPickerOption } from "@/components/admin/shared/TeamSearchablePicker";
import type { ExternalClubPickerResult } from "./ExternalClubPicker";
import { SceClubTeamSelectorDialog } from "@/components/sce/club-team-selector/SceClubTeamSelectorDialog";
import type { SceSelectableTeam } from "@/lib/sce/club-team-selector/types";
import { PopoverContent } from "@/components/ui/Popover";
import { SceTournamentParticipantTile } from "@/components/sce/tournament/SceTournamentParticipantTile";
import type { TournamentLobbyGridDensity } from "@/lib/tournaments/tournament-participant-presentation";

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
  lobbyDensity?: TournamentLobbyGridDensity;
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
  triggerVariant = "lobby-tile",
  lobbyDensity = "spacious",
}: Props) {
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [clubDialogOpen, setClubDialogOpen] = useState(false);
  const [manualLabel, setManualLabel] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const teamTriggerRef = useRef<HTMLButtonElement>(null);
  const clubTriggerRef = useRef<HTMLButtonElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

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

  function openOwnTeamDialog() {
    setMenuOpen(false);
    setTeamDialogOpen(true);
  }

  function openExternalClubDialog() {
    setMenuOpen(false);
    setClubDialogOpen(true);
  }

  function openManualEntry() {
    setMenuOpen(false);
    setShowManualEntry(true);
  }

  const triggerDisabled = pending;

  const menuTrigger =
    triggerVariant === "lobby-tile" ? (
      <SceTournamentParticipantTile
        variant="add"
        density={lobbyDensity}
        disabled={triggerDisabled}
        triggerRef={menuTriggerRef}
        onActivate={() => setMenuOpen(true)}
        testId="tournament-participant-add-tile"
      />
    ) : (
      <button
        ref={menuTriggerRef}
        type="button"
        onClick={() => setMenuOpen(true)}
        disabled={triggerDisabled}
        data-testid="tournament-participant-add-trigger"
        className="fca-button-secondary h-9"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Teilnehmer hinzufügen
      </button>
    );

  return (
    <div data-testid="tournament-participant-add-workflow" className={triggerVariant === "standalone" ? "space-y-3" : undefined}>
      {menuTrigger}

      <PopoverContent
        open={menuOpen}
        onOpenChange={setMenuOpen}
        anchorRef={menuTriggerRef}
        role="listbox"
        id={menuId}
        placement="bottom-start"
      >
        <ul className="min-w-[12rem] py-1" role="listbox" aria-label="Teilnehmer hinzufügen">
          <li>
            <button
              type="button"
              className="flex w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)] focus-visible:bg-[var(--surface-2)] focus-visible:outline-none"
              onClick={openOwnTeamDialog}
              disabled={teamsLoading || availableTeams.length === 0}
              data-testid={`${teamSelectTestId}-menu-option`}
            >
              Eigenes Team
            </button>
          </li>
          <li>
            <button
              type="button"
              className="flex w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)] focus-visible:bg-[var(--surface-2)] focus-visible:outline-none"
              onClick={openExternalClubDialog}
              data-testid={`${externalClubTestId}-menu-option`}
            >
              Externer Verein
            </button>
          </li>
          <li>
            <button
              type="button"
              className="flex w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)] focus-visible:bg-[var(--surface-2)] focus-visible:outline-none"
              onClick={openManualEntry}
              data-testid="tournament-participant-manual-menu-option"
            >
              Manuell
            </button>
          </li>
        </ul>
      </PopoverContent>

      {triggerVariant === "standalone" && noWritableTeamsMessage ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">{noWritableTeamsMessage}</div>
      ) : null}

      {showManualEntry ? (
        <div className="mt-3 grid gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
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
        returnFocusRef={menuTriggerRef}
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
        returnFocusRef={menuTriggerRef}
      />
    </div>
  );
}
