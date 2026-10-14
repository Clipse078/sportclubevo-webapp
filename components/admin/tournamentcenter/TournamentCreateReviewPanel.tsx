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
import { SceTournamentParticipantTile } from "@/components/sce/tournament/SceTournamentParticipantTile";
import { cn } from "@/lib/cn";

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

function reviewGridClass(density: ReturnType<typeof resolveTournamentLobbyGridDensity>): string {
  if (density === "spacious") return "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";
  if (density === "balanced") return "grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4";
  return "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
}

function ReviewParticipantSection({
  title,
  identities,
  testId,
}: {
  title: string;
  identities: ReturnType<typeof buildTournamentLobbyParticipantIdentities>;
  testId: string;
}) {
  if (identities.length === 0) return null;
  const density = resolveTournamentLobbyGridDensity(identities.length);
  return (
    <div data-testid={testId} className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{title}</p>
      <div className={cn(reviewGridClass(density))}>
        {identities.map((model) => (
          <SceTournamentParticipantTile
            key={model.localId}
            variant="participant"
            model={model}
            density={density}
            readOnly
            testId={`${testId}-tile-${model.localId}`}
          />
        ))}
      </div>
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
  const ownTeams = participantIdentities.filter((p) => p.kind === "TEAM");
  const externalClubs = participantIdentities.filter((p) => p.kind === "EXTERNAL_CLUB");
  const manualParticipants = participantIdentities.filter((p) => p.kind === "MANUAL");

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
          <SummaryRow label="Veranstalter">
            <div className="flex items-center gap-3">
              <ClubCrest identity={organiserIdentity} density="management" decorative />
              <span className="font-medium">{summary.organiserLabel}</span>
            </div>
          </SummaryRow>
        </div>
      ) : (
        <SummaryRow label="Veranstalter">
          <span className="text-[var(--text-2)]">Nicht angegeben</span>
        </SummaryRow>
      )}

      <div className="space-y-4" data-testid="tournament-create-review-participant-lobby">
        {participantIdentities.length > 0 ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Teilnehmer</p>
              <p className="text-sm text-[var(--text-2)]" data-testid="tournament-create-review-participant-total">
                {summary.participantCount} gesamt
              </p>
            </div>
            <ReviewParticipantSection
              title="Eigene Teams"
              identities={ownTeams}
              testId="tournament-create-review-own-teams"
            />
            <ReviewParticipantSection
              title="Teilnehmende Vereine"
              identities={externalClubs}
              testId="tournament-create-review-external-clubs"
            />
            <ReviewParticipantSection
              title="Manuelle Teilnehmer"
              identities={manualParticipants}
              testId="tournament-create-review-manual-participants"
            />
          </>
        ) : (
          <p className="text-sm text-[var(--sce-danger)]" role="alert">
            Mindestens ein Teilnehmer erforderlich.
          </p>
        )}
      </div>

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

      <SummaryRow label="Publikation">
        {summary.publicationLabels.length > 0 ? (
          <p>{summary.publicationLabels.join(" · ")}</p>
        ) : (
          <p className="text-[var(--text-2)]">Keine Kanäle aktiv</p>
        )}
      </SummaryRow>

    </div>
  );
}
