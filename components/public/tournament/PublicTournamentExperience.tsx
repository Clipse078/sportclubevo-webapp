"use client";

import { useState } from "react";
import { ClubCrest } from "@/components/sporting-activity/ClubCrest";
import { buildClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import type { PublicTournamentViewModel } from "@/lib/tournaments/public/types";
import { resolveTeamSpielplan } from "@/lib/tournaments/spielplan/build-tournament-spielplan-view-model";
import TournamentSpielplanMasterSchedule from "@/components/sce/tournament/TournamentSpielplanMasterSchedule";
import TournamentSpielplanMobileTimeline from "@/components/sce/tournament/TournamentSpielplanMobileTimeline";
import TournamentSpielplanTeamPlanView from "@/components/sce/tournament/TournamentSpielplanTeamPlanView";
import PublicTournamentCopyLinkButton from "./PublicTournamentCopyLinkButton";
import { SCE_TOURNAMENT_SELECT_CLASS } from "@/lib/sce/tournament/sce-tournament-interactive-a11y";
import { cn } from "@/lib/cn";

type Props = {
  model: PublicTournamentViewModel;
  tenantName: string;
  absolutePublicUrl: string;
};

function formatDateLine(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  });
}

export default function PublicTournamentExperience({
  model,
  tenantName,
  absolutePublicUrl,
}: Props) {
  const timeZone = "Europe/Zurich";
  const { tournament, spielplan } = model;
  const [highlightParticipantId, setHighlightParticipantId] = useState<string | null>(null);
  const [teamParticipantId, setTeamParticipantId] = useState<string | null>(null);
  const teamPlan = teamParticipantId
    ? resolveTeamSpielplan(spielplan, teamParticipantId)
    : null;

  const hasSpielplan =
    spielplan.presentationItems.length > 0 ||
    spielplan.matrixRows.length > 0 ||
    spielplan.mobileSlots.length > 0;

  return (
    <div
      className="mx-auto min-h-screen max-w-3xl bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6"
      data-testid="public-tournament-experience"
    >
      <header className="space-y-3 border-b border-[var(--border)] pb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {tenantName}
        </p>
        <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{tournament.title}</h1>
        <p className="text-sm text-[var(--text-2)]">{formatDateLine(tournament.startAt, timeZone)}</p>
        {tournament.location ? (
          <p className="text-sm text-[var(--text-2)]">{tournament.location}</p>
        ) : null}
        {tournament.organizerName ? (
          <div className="flex items-center gap-2 text-sm">
            <ClubCrest
              identity={buildClubIdentity({
                displayName: tournament.organizerName,
                logoUrl: tournament.organizerLogoUrl,
              })}
              density="compact"
              decorative
            />
            <span>{tournament.organizerName}</span>
          </div>
        ) : null}
        <PublicTournamentCopyLinkButton absoluteUrl={absolutePublicUrl} />
      </header>

      <section className="py-6" aria-labelledby="public-tournament-spielplan-heading">
        <h2 id="public-tournament-spielplan-heading" className="mb-3 text-lg font-semibold">
          Spielplan
        </h2>
        {!hasSpielplan ? (
          <p className="text-sm text-[var(--text-2)]">Noch kein öffentlicher Spielplan verfügbar.</p>
        ) : (
          <div className="space-y-4">
            {spielplan.participants.length > 0 ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label htmlFor="public-spielplan-highlight" className="text-sm font-medium">
                  Team
                </label>
                <select
                  id="public-spielplan-highlight"
                  className={cn(SCE_TOURNAMENT_SELECT_CLASS, "bg-[var(--surface)]")}
                  value={highlightParticipantId ?? ""}
                  onChange={(e) => setHighlightParticipantId(e.target.value || null)}
                  data-testid="public-spielplan-team-highlight"
                >
                  <option value="">Master-Spielplan</option>
                  {spielplan.participants.map((p) => (
                    <option key={p.participantId} value={p.participantId}>
                      {p.displayName}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Team-Spielplan"
                  className={cn(SCE_TOURNAMENT_SELECT_CLASS, "bg-[var(--surface)]")}
                  value={teamParticipantId ?? ""}
                  onChange={(e) => setTeamParticipantId(e.target.value || null)}
                  data-testid="public-spielplan-team-plan"
                >
                  <option value="">Team-Spielplan…</option>
                  {spielplan.participants.map((p) => (
                    <option key={p.participantId} value={p.participantId}>
                      {p.displayName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="hidden lg:block">
              <TournamentSpielplanMasterSchedule
                model={spielplan}
                highlightParticipantId={highlightParticipantId}
              />
            </div>
            <TournamentSpielplanMobileTimeline
              model={spielplan}
              highlightParticipantId={highlightParticipantId}
            />
            {teamPlan ? (
              <TournamentSpielplanTeamPlanView
                teamPlan={teamPlan}
                tournamentTitle={tournament.title}
                dateLabel={spielplan.identity.dateLabel}
                fixtures={spielplan.fixtures}
                participants={spielplan.participants}
                timezone={spielplan.identity.timezone}
              />
            ) : null}
          </div>
        )}
      </section>

      {model.participants.length > 0 ? (
        <section className="py-6" aria-labelledby="public-tournament-participants-heading">
          <h2 id="public-tournament-participants-heading" className="mb-3 text-lg font-semibold">
            Teilnehmer
          </h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {model.participants.map((p) => (
              <li
                key={p.id}
                className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              >
                <ClubCrest
                  identity={buildClubIdentity({
                    id: p.id,
                    displayName: p.displayName,
                    logoUrl: p.crestUrl,
                  })}
                  density="compact"
                  decorative
                />
                <span className="text-sm font-medium">{p.displayName}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {model.groupStandings.length > 0 ? (
        <section className="py-6" aria-labelledby="public-tournament-standings-heading">
          <h2 id="public-tournament-standings-heading" className="mb-3 text-lg font-semibold">
            Gruppentabelle
          </h2>
          <div className="space-y-6">
            {model.groupStandings.map((group) => (
              <div key={group.groupId} className="overflow-x-auto rounded-lg border border-[var(--border)]">
                <p className="border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold">
                  {group.groupLabel}
                </p>
                <table className="w-full min-w-[320px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
                      <th className="px-2 py-2">#</th>
                      <th className="px-2 py-2">Team</th>
                      <th className="px-2 py-2 text-right">Sp</th>
                      <th className="px-2 py-2 text-right">Pkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr key={row.participantId} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-2 py-2 tabular-nums">{row.position}</td>
                        <td className="px-2 py-2">
                          {row.displayName}
                          {row.tiedAtPosition ? (
                            <span className="ml-1 text-xs text-[var(--muted)]">(gleich)</span>
                          ) : null}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">{row.played}</td>
                        <td className="px-2 py-2 text-right tabular-nums font-semibold">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
