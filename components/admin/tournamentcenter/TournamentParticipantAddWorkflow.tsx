"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import TeamSearchablePicker, { type TeamPickerOption } from "@/components/admin/shared/TeamSearchablePicker";
import { ExternalClubPicker, type ExternalClubPickerResult } from "./ExternalClubPicker";

type Props = {
  availableTeams: TeamPickerOption[];
  teamsLoading?: boolean;
  tenantLogoUrl?: string | null;
  onAddTeam: (teamId: string) => void;
  onAddExternalClub: (club: ExternalClubPickerResult) => void;
  onAddManual: (label: string) => void;
  pending?: boolean;
  teamSelectTestId?: string;
  externalClubTestId?: string;
  manualInputTestId?: string;
  manualButtonTestId?: string;
  noWritableTeamsMessage?: React.ReactNode;
};

export default function TournamentParticipantAddWorkflow({
  availableTeams,
  teamsLoading = false,
  tenantLogoUrl = null,
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
  const [teamPickId, setTeamPickId] = useState("");
  const [selectedClub, setSelectedClub] = useState<ExternalClubPickerResult | null>(null);
  const [manualLabel, setManualLabel] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);

  return (
    <div className="space-y-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
      <p className="text-sm font-semibold text-[var(--foreground)]">Team hinzufügen</p>

      {noWritableTeamsMessage}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--text-2)]">FC Allschwil Team</p>
          <TeamSearchablePicker
            options={availableTeams}
            value={teamPickId}
            onChange={setTeamPickId}
            tenantLogoUrl={tenantLogoUrl}
            disabled={teamsLoading || pending || availableTeams.length === 0}
            testId={teamSelectTestId}
            placeholder={teamsLoading ? "Teams laden…" : "Team suchen…"}
          />
          <button
            type="button"
            onClick={() => {
              if (!teamPickId) return;
              onAddTeam(teamPickId);
              setTeamPickId("");
            }}
            disabled={!teamPickId || pending}
            data-testid={`${teamSelectTestId}-button`}
            className="fca-button-secondary w-full sm:w-auto"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            FC-Team hinzufügen
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--text-2)]">Verein / externes Team</p>
          <ExternalClubPicker
            selected={selectedClub}
            onSelect={setSelectedClub}
            onClearSelected={() => setSelectedClub(null)}
            disabled={pending}
            placeholder="Verein aus Verzeichnis suchen…"
            testId={externalClubTestId}
          />
          <button
            type="button"
            onClick={() => {
              if (!selectedClub) return;
              onAddExternalClub(selectedClub);
              setSelectedClub(null);
            }}
            disabled={!selectedClub || pending}
            data-testid={`${externalClubTestId}-button`}
            className="fca-button-secondary w-full sm:w-auto"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Externen Verein hinzufügen
          </button>
        </div>
      </div>

      {showManualEntry ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={manualLabel}
            onChange={(e) => setManualLabel(e.target.value)}
            placeholder="z. B. unbekanntes Gastteam"
            disabled={pending}
            data-testid={manualInputTestId}
            className="fca-input flex-1"
          />
          <button
            type="button"
            onClick={() => {
              const trimmed = manualLabel.trim();
              if (!trimmed) return;
              onAddManual(trimmed);
              setManualLabel("");
            }}
            disabled={!manualLabel.trim() || pending}
            data-testid={manualButtonTestId}
            className="fca-button-secondary shrink-0"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Manuell hinzufügen
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowManualEntry(true)}
          className="text-xs font-medium text-[var(--muted)] underline-offset-2 hover:underline"
        >
          Team ohne Verzeichniseintrag manuell erfassen…
        </button>
      )}
    </div>
  );
}
