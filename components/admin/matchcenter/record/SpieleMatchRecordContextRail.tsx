import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarRange, Cloud, MapPin } from "lucide-react";
import SpieleMatchRecordReadinessPill from "./SpieleMatchRecordReadinessPill";
import type { MatchcenterOperationalAssessment } from "@/lib/matchcenter/operational-state";

type Props = {
  statusLabel: string;
  assessment: MatchcenterOperationalAssessment;
  homeAway: string | null;
  homeName: string;
  awayName: string;
  scheduleLine: string;
  kickoffTime: string;
  facilityLine: string | null;
  dressingLine: string | null;
  sourceLabel: string;
  isProtectedSource: boolean;
  lastChangedLabel: string;
  wochenplanerHref: string;
};

function RailBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
        {title}
      </p>
      {children}
    </div>
  );
}

export default function SpieleMatchRecordContextRail({
  statusLabel,
  assessment,
  homeAway,
  homeName,
  awayName,
  scheduleLine,
  kickoffTime,
  facilityLine,
  dressingLine,
  sourceLabel,
  isProtectedSource,
  lastChangedLabel,
  wochenplanerHref,
}: Props) {
  return (
    <div
      className="space-y-4 rounded-xl border border-[var(--border)]/80 bg-[var(--surface)]/60 p-4 text-sm"
      data-testid="spiele-record-context-rail"
    >
      <RailBlock title="Status">
        <div className="flex flex-wrap items-center gap-2">
          <SpieleMatchRecordReadinessPill assessment={assessment} homeAway={homeAway} />
          <span className="text-xs text-[var(--text-2)]">{statusLabel}</span>
        </div>
      </RailBlock>

      <RailBlock title="Spiel">
        <p className="font-medium text-[var(--foreground)]">{homeName}</p>
        <p className="text-xs text-[var(--muted)]">vs</p>
        <p className="font-medium text-[var(--foreground)]">{awayName}</p>
      </RailBlock>

      <RailBlock title="Termin">
        <p className="text-[var(--text-2)]">{scheduleLine}</p>
        <p className="text-sm font-medium tabular-nums text-[var(--foreground)]">{kickoffTime}</p>
      </RailBlock>

      {(facilityLine || dressingLine) && homeAway?.trim().toUpperCase() === "HOME" ? (
        <RailBlock title="Anlage">
          {facilityLine ? (
            <p className="inline-flex items-center gap-1.5 text-[var(--text-2)]">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-400/90" aria-hidden />
              {facilityLine}
            </p>
          ) : null}
          {dressingLine ? <p className="text-xs text-[var(--muted)]">{dressingLine}</p> : null}
        </RailBlock>
      ) : null}

      <RailBlock title="Quelle">
        <p className="inline-flex items-center gap-1.5 text-[var(--text-2)]">
          <Cloud className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
          {sourceLabel}
          {isProtectedSource ? (
            <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              · synchronisiert
            </span>
          ) : null}
        </p>
      </RailBlock>

      <RailBlock title="Letzte Änderung">
        <p className="text-xs text-[var(--text-2)]" data-testid="spiele-record-last-changed">
          {lastChangedLabel}
        </p>
      </RailBlock>

      <Link
        href={wochenplanerHref}
        className="fca-button-secondary inline-flex w-full items-center justify-center gap-1.5 text-xs"
        data-testid="spiele-record-rail-wochenplaner"
      >
        <CalendarRange className="h-3.5 w-3.5" aria-hidden />
        Im Wochenplaner anzeigen
      </Link>
    </div>
  );
}
