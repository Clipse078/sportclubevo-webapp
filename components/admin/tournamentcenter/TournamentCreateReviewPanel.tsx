"use client";

import type { ReactNode } from "react";
import { ClubCrest } from "@/components/sporting-activity/ClubCrest";
import { buildClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import { buildTournamentCreateReviewSummary } from "@/lib/tournaments/tournament-create-review-summary";
import {
  buildTournamentLobbyParticipantIdentities,
  resolveTournamentLobbyGridDensity,
} from "@/lib/tournaments/tournament-participant-presentation";
import type { TournamentComposerDraftPayload } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { ExternalClubPickerResult } from "./ExternalClubPicker";
import { SceTournamentParticipantLobby } from "@/components/sce/tournament/SceTournamentParticipantLobby";

type Props = {
  payload: TournamentComposerDraftPayload;
  organizer: ExternalClubPickerResult | null;
  tenantClubName: string;
  tenantLogoUrl: string | null;
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
};

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <div className="text-sm text-[var(--foreground)]">{children}</div>
    </div>
  );
}

export default function TournamentCreateReviewPanel({
  payload,
  organizer,
  tenantClubName,
  tenantLogoUrl,
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
}: Props) {
  const summary = buildTournamentCreateReviewSummary({
    payload,
    organizer,
    pitchHallFacilityGroups,
    dressingRoomFacilityGroups,
  });
  const participantIdentities = buildTournamentLobbyParticipantIdentities({
    participants: payload.participants,
    tenantClubName,
    tenantLogoUrl,
  });
  const lobbyDensity = resolveTournamentLobbyGridDensity(participantIdentities.length);
  const organiserIdentity = organizer
    ? buildClubIdentity({
        id: organizer.id,
        displayName: organizer.name,
        shortName: organizer.shortName,
        logoUrl: organizer.logoUrl ?? null,
      })
    : null;

  return (
    <div className="space-y-6" data-testid="tournament-create-review-panel">
      <p className="text-sm text-[var(--text-2)]">
        Prüfen Sie Turnieridentität, Teilnehmer und Termin, bevor Sie das Turnier erstellen oder zur Freigabe
        einreichen.
      </p>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 p-4">
        <SummaryRow label="Turnier">
          <p className="text-lg font-semibold">{summary.title}</p>
          <p className="mt-1 text-[var(--text-2)]">
            {summary.homeAwayLabel}
            {payload.competitionLabel.trim() ? ` · ${payload.competitionLabel.trim()}` : ""}
          </p>
        </SummaryRow>
      </div>

      {organiserIdentity ? (
        <div data-testid="tournament-create-review-organiser">
          <SummaryRow label="Organisator">
            <div className="flex items-center gap-3">
              <ClubCrest identity={organiserIdentity} density="management" decorative />
              <span className="font-medium">{summary.organiserLabel}</span>
            </div>
          </SummaryRow>
        </div>
      ) : (
        <SummaryRow label="Organisator">
          <span className="text-[var(--text-2)]">Nicht angegeben</span>
        </SummaryRow>
      )}

      {participantIdentities.length > 0 ? (
        <SceTournamentParticipantLobby
          participants={participantIdentities}
          onRemoveParticipant={() => undefined}
          addParticipantSlot={null}
          density={lobbyDensity}
          reviewMode
          testId="tournament-create-review-participant-lobby"
        />
      ) : (
        <p className="text-sm text-[var(--sce-danger)]" role="alert">
          Mindestens ein Teilnehmer erforderlich.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryRow label="Termin">
          <p>{summary.scheduleLabel}</p>
          {summary.endTimeLabel ? (
            <p className="text-[var(--text-2)]">
              {summary.multiDay ? "Ende (Datum/Uhrzeit)" : "Ende"}:{" "}
              {summary.multiDay ? payload.endAt : summary.endTimeLabel}
            </p>
          ) : null}
          {summary.meetingTimeLabel ? (
            <p className="text-[var(--text-2)]">Treffpunkt: {summary.meetingTimeLabel}</p>
          ) : null}
        </SummaryRow>
        <SummaryRow label="Ort">
          {summary.locationLabel ? <p>{summary.locationLabel}</p> : <p className="text-[var(--text-2)]">—</p>}
        </SummaryRow>
      </div>

      <SummaryRow label="Ressourcen">
        {payload.homeAway === "AWAY" ? (
          <p className="text-[var(--text-2)]">Auswärtsturnier — keine Vereinsressourcen.</p>
        ) : summary.resourceLabels.length > 0 || summary.dressingRoomByParticipant.length > 0 ? (
          <ul className="space-y-1">
            {summary.resourceLabels.map((label) => (
              <li key={`res-${label}`}>Spielfeld / Halle: {label}</li>
            ))}
            {summary.dressingRoomByParticipant.map((row) => (
              <li key={`${row.participantLabel}-${row.resourceLabel}`}>
                Garderobe {row.participantLabel}: {row.resourceLabel}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[var(--text-2)]">Nicht zugewiesen</p>
        )}
      </SummaryRow>

      <SummaryRow label="Ausspielung">
        {summary.publicationLabels.length > 0 ? (
          <p>{summary.publicationLabels.join(" · ")}</p>
        ) : (
          <p className="text-[var(--text-2)]">Keine Kanäle aktiv</p>
        )}
      </SummaryRow>

      <p className="text-xs text-[var(--text-2)]">
        Eigenes Team: {summary.ownTeamCount} · Externe Vereine: {summary.externalClubCount} · Manuell:{" "}
        {summary.manualCount}
      </p>
    </div>
  );
}
