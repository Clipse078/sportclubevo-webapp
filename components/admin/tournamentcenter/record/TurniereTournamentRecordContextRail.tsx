import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarRange } from "lucide-react";
import TurniereTournamentRecordReadinessPill from "./TurniereTournamentRecordReadinessPill";
import type { TournamentOperationalAssessment } from "@/lib/tournaments/operational-state";

type Props = {
  statusLabel: string;
  assessment: TournamentOperationalAssessment;
  tournamentTitle: string;
  scheduleLine: string;
  timeLine: string;
  participantSummary: string | null;
  facilityLine: string | null;
  publicationLabel: string;
  lastChangedLabel: string;
  wochenplanerHref: string;
  showReadiness: boolean;
};

function RailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
        {title}
      </p>
      {children}
    </div>
  );
}

export default function TurniereTournamentRecordContextRail({
  statusLabel,
  assessment,
  tournamentTitle,
  scheduleLine,
  timeLine,
  participantSummary,
  facilityLine,
  publicationLabel,
  lastChangedLabel,
  wochenplanerHref,
  showReadiness,
}: Props) {
  return (
    <div
      className="space-y-4 rounded-xl border border-[var(--border)]/80 bg-[var(--surface)]/60 p-4 text-sm"
      data-testid="turniere-record-context-rail"
    >
      <RailBlock title="Status">
        <div className="flex flex-wrap items-center gap-2">
          {showReadiness ? <TurniereTournamentRecordReadinessPill assessment={assessment} /> : null}
          <span className="text-xs text-[var(--text-2)]">{statusLabel}</span>
        </div>
      </RailBlock>

      <RailBlock title="Turnier">
        <p className="font-medium text-[var(--foreground)]">{tournamentTitle}</p>
      </RailBlock>

      <RailBlock title="Termin">
        <p className="text-[var(--text-2)]">{scheduleLine}</p>
        <p className="text-sm font-medium tabular-nums text-[var(--foreground)]">{timeLine}</p>
      </RailBlock>

      {participantSummary ? (
        <RailBlock title="Teilnehmer">
          <p className="text-[var(--text-2)]">{participantSummary}</p>
        </RailBlock>
      ) : null}

      {facilityLine ? (
        <RailBlock title="Anlage">
          <p className="text-[var(--text-2)]">{facilityLine}</p>
        </RailBlock>
      ) : null}

      <RailBlock title="Veröffentlichung">
        <p className="text-[var(--text-2)]">{publicationLabel}</p>
      </RailBlock>

      <RailBlock title="Letzte Änderung">
        <p className="text-xs text-[var(--text-2)]" data-testid="turniere-record-last-changed">
          {lastChangedLabel}
        </p>
      </RailBlock>

      <Link
        href={wochenplanerHref}
        className="fca-button-secondary inline-flex w-full items-center justify-center gap-1.5 text-xs"
        data-testid="turniere-record-rail-wochenplaner"
      >
        <CalendarRange className="h-3.5 w-3.5" aria-hidden />
        Im Wochenplaner anzeigen
      </Link>
    </div>
  );
}
