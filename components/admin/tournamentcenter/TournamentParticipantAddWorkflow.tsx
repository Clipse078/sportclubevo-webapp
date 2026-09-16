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
    <div
      className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3"
      data-testid="tournament-participant-add-workflow"
    >
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Teilnehmer hinzufügen</p>

      {noWritableTeamsMessage}

      <div className="flex flex-col gap-3 lg:max-w-2xl">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-medium text-[var(--text-2)]">FC-Team</p>
            <TeamSearchablePicker
              options={availableTeams}
              value={teamPickId}
              onChange={setTeamPickId}
              tenantLogoUrl={tenantLogoUrl}
              disabled={teamsLoading || pending || availableTeams.length === 0}
              testId={teamSelectTestId}
              placeholder={teamsLoading ? "Teams laden…" : "Team suchen…"}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!teamPickId) return;
              onAddTeam(teamPickId);
              setTeamPickId("");
            }}
            disabled={!teamPickId || pending}
            data-testid={`${teamSelectTestId}-button`}
            className="fca-button-secondary h-9 shrink-0 whitespace-nowrap"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            FC-Team
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-medium text-[var(--text-2)]">Externer Verein</p>
            <ExternalClubPicker
              selected={selectedClub}
              onSelect={setSelectedClub}
              onClearSelected={() => setSelectedClub(null)}
              disabled={pending}
              placeholder="Verein aus Verzeichnis suchen…"
              testId={externalClubTestId}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!selectedClub) return;
              onAddExternalClub(selectedClub);
              setSelectedClub(null);
            }}
            disabled={!selectedClub || pending}
            data-testid={`${externalClubTestId}-button`}
            className="fca-button-secondary h-9 shrink-0 whitespace-nowrap"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Externer Verein
          </button>
        </div>

        {showManualEntry ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
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
                const trimmed = manualLabel.trim();
                if (!trimmed) return;
                onAddManual(trimmed);
                setManualLabel("");
              }}
              disabled={!manualLabel.trim() || pending}
              data-testid={manualButtonTestId}
              className="fca-button-secondary h-9 shrink-0 whitespace-nowrap"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Manuell erfassen
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowManualEntry(true)}
            className="text-left text-xs font-medium text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
          >
            Manuell erfassen…
          </button>
        )}
      </div>
    </div>
  );
}
