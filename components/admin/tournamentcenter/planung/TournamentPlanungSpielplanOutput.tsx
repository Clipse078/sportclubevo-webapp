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
      className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4"
      data-testid="tournament-planung-spielplan-output"
    >
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">Spielplan-Ausgabe</h3>
          <p className="text-sm text-[var(--muted)]">
            Master-Spielplan, Teampläne, Druck, PDF und Teilen — ohne den Planungsstand zu verändern.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={masterPrintUrl}
            target="_blank"
            rel="noreferrer"
            data-testid="spielplan-print-master"
            className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface)]"
          >
            <Printer className="mr-1.5 h-4 w-4" aria-hidden />
            Drucken
          </a>
          <a
            href={masterPdfUrl}
            data-testid="spielplan-pdf-master"
            className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface)]"
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
                className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface)]"
              >
                Team drucken
              </a>
              <a
                href={teamPdfUrl}
                data-testid="spielplan-pdf-team"
                className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface)]"
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

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label htmlFor="spielplan-team-highlight" className="text-sm font-medium">
          Team hervorheben
        </label>
        <select
          id="spielplan-team-highlight"
          className={cn(
            "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm",
          )}
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
        <label htmlFor="spielplan-team-plan" className="text-sm font-medium sm:ml-2">
          Team-Spielplan
        </label>
        <select
          id="spielplan-team-plan"
          className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
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
    </section>
  );
}
