"use client";

import { useMemo, useState } from "react";
import { Download, Printer, Share2 } from "lucide-react";
import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";
import {
  buildTournamentSpielplanFromPlanung,
  resolveTeamSpielplan,
} from "@/lib/tournaments/spielplan/build-tournament-spielplan-view-model";
import TournamentSpielplanMasterSchedule from "@/components/sce/tournament/TournamentSpielplanMasterSchedule";
import TournamentSpielplanMobileTimeline from "@/components/sce/tournament/TournamentSpielplanMobileTimeline";
import TournamentSpielplanTeamPlanView from "@/components/sce/tournament/TournamentSpielplanTeamPlanView";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  SCE_TOURNAMENT_WORKSPACE_HEADER_DIVIDER_CLASS,
  SCE_TOURNAMENT_WORKSPACE_SCHEDULE_DIVIDER_CLASS,
  SCE_TOURNAMENT_WORKSPACE_SURFACE_CLASS,
} from "@/lib/sce/tournament/sce-tournament-surface-layout";
import {
  SCE_TOURNAMENT_ACTION_LINK_CLASS,
  SCE_TOURNAMENT_SELECT_CLASS,
} from "@/lib/sce/tournament/sce-tournament-interactive-a11y";

type Props = {
  planungModel: TournamentPlanungViewModel;
  tournamentId: string;
  title: string;
  startAtIso: string;
  location: string | null;
  organizerName: string | null;
  tenantName: string | null;
  tenantLogoUrl: string | null;
  timezone: string;
  publicPath?: string | null;
};

export default function TournamentPlanungSpielplanOutput({
  planungModel,
  tournamentId,
  title,
  startAtIso,
  location,
  organizerName,
  tenantName,
  tenantLogoUrl,
  timezone,
  publicPath,
}: Props) {
  const [highlightParticipantId, setHighlightParticipantId] = useState<string | null>(null);
  const [teamParticipantId, setTeamParticipantId] = useState<string | null>(null);

  const spielplan = useMemo(
    () =>
      buildTournamentSpielplanFromPlanung({
        tournamentId,
        title,
        startAtIso,
        location,
        organizerName,
        tenantName,
        tenantLogoUrl,
        timezone,
        pitches: planungModel.pitches.map((p) => ({
          pitchId: p.pitchId,
          displayOrder: p.displayOrder,
          label: p.label,
          formatHint: p.formatHint,
        })),
        cells: planungModel.cells,
        scheduleSections: planungModel.scheduleSections,
        participants: planungModel.participants.map((p) => ({
          participantId: p.participantId,
          displayName: p.displayName,
          crestUrl: p.crestUrl,
        })),
      }),
    [
      planungModel,
      tournamentId,
      title,
      startAtIso,
      location,
      organizerName,
      tenantName,
      tenantLogoUrl,
      timezone,
    ],
  );

  const effectiveTeamId = teamParticipantId ?? highlightParticipantId;
  const teamPlan = effectiveTeamId ? resolveTeamSpielplan(spielplan, effectiveTeamId) : null;

  const masterPrintUrl = `/tournaments/${tournamentId}/spielplan/print/master`;
  const teamPrintUrl =
    effectiveTeamId != null
      ? `/tournaments/${tournamentId}/spielplan/print/team/${effectiveTeamId}`
      : null;

  const masterPdfUrl = `/api/tournaments/${tournamentId}/planung/spielplan/pdf`;
  const teamPdfUrl =
    effectiveTeamId != null
      ? `/api/tournaments/${tournamentId}/planung/spielplan/pdf?participantId=${encodeURIComponent(effectiveTeamId)}`
      : null;

  const copyShareLink = () => {
    if (!publicPath) return;
    const url = `${window.location.origin}${publicPath}`;
    void navigator.clipboard?.writeText(url);
  };

  return (
    <section
      className={cn(SCE_TOURNAMENT_WORKSPACE_SURFACE_CLASS, "space-y-0 p-4 md:p-5")}
      data-testid="tournament-planung-spielplan-output"
    >
      <header
        className={cn(
          SCE_TOURNAMENT_WORKSPACE_HEADER_DIVIDER_CLASS,
          "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between",
        )}
      >
        <div className="min-w-0 space-y-1.5">
          <h3 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            Spielplan
          </h3>
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-2)]">
            Master-Spielplan, Teampläne, Druck, PDF und Teilen.
          </p>
        </div>
        <div
          className="flex flex-wrap gap-2 lg:justify-end"
          role="group"
          aria-label="Spielplan-Aktionen"
        >
          <a
            href={masterPrintUrl}
            target="_blank"
            rel="noreferrer"
            data-testid="spielplan-print-master"
            className={SCE_TOURNAMENT_ACTION_LINK_CLASS}
          >
            <Printer className="mr-1.5 h-4 w-4" aria-hidden />
            Drucken
          </a>
          <a
            href={masterPdfUrl}
            data-testid="spielplan-pdf-master"
            className={SCE_TOURNAMENT_ACTION_LINK_CLASS}
          >
            <Download className="mr-1.5 h-4 w-4" aria-hidden />
            PDF
          </a>
          {teamPrintUrl && teamPdfUrl ? (
            <>
              <a
                href={teamPrintUrl}
                target="_blank"
                rel="noreferrer"
                data-testid="spielplan-print-team"
                className={SCE_TOURNAMENT_ACTION_LINK_CLASS}
              >
                Team drucken
              </a>
              <a
                href={teamPdfUrl}
                data-testid="spielplan-pdf-team"
                className={SCE_TOURNAMENT_ACTION_LINK_CLASS}
              >
                Team-PDF
              </a>
            </>
          ) : null}
          {publicPath ? (
            <Button type="button" variant="secondary" onClick={copyShareLink} data-testid="spielplan-share-copy">
              <Share2 className="mr-1.5 h-4 w-4" aria-hidden />
              Link kopieren
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
        <label htmlFor="spielplan-team-highlight" className="text-sm font-medium text-[var(--foreground)]">
          Team hervorheben
        </label>
        <select
          id="spielplan-team-highlight"
          className={cn(SCE_TOURNAMENT_SELECT_CLASS, "min-w-[12rem] flex-1 sm:max-w-xs sm:flex-none")}
          value={highlightParticipantId ?? ""}
          onChange={(e) => setHighlightParticipantId(e.target.value || null)}
          data-testid="spielplan-team-highlight-select"
        >
          <option value="">Keine Hervorhebung</option>
          {spielplan.participants.map((p) => (
            <option key={p.participantId} value={p.participantId}>
              {p.displayName}
            </option>
          ))}
        </select>
        <label htmlFor="spielplan-team-plan" className="text-sm font-medium text-[var(--foreground)] sm:ml-auto lg:ml-2">
          Team-Spielplan
        </label>
        <select
          id="spielplan-team-plan"
          className={cn(SCE_TOURNAMENT_SELECT_CLASS, "min-w-[12rem] flex-1 sm:max-w-xs sm:flex-none")}
          value={teamParticipantId ?? ""}
          onChange={(e) => setTeamParticipantId(e.target.value || null)}
          data-testid="spielplan-team-plan-select"
        >
          <option value="">Team wählen…</option>
          {spielplan.participants.map((p) => (
            <option key={p.participantId} value={p.participantId}>
              {p.displayName}
            </option>
          ))}
        </select>
      </div>

      <div className={cn(SCE_TOURNAMENT_WORKSPACE_SCHEDULE_DIVIDER_CLASS, "space-y-5")}>
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
            tournamentTitle={title}
            dateLabel={spielplan.identity.dateLabel}
            fixtures={spielplan.fixtures}
            participants={spielplan.participants}
            timezone={spielplan.identity.timezone}
          />
        ) : null}
      </div>
    </section>
  );
}
