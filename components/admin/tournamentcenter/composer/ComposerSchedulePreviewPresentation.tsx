"use client";

import SceTournamentSpielplanPreviewFixtureCard from "@/components/sce/tournament/SceTournamentSpielplanPreviewFixtureCard";
import SceTournamentScheduleBreakPresentation from "@/components/sce/tournament/SceTournamentScheduleBreakPresentation";
import type { TournamentComposerDraftPayload } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import type { ComposerSchedulePreviewTimelineItem } from "@/lib/tournaments/composer/build-composer-schedule-preview-timeline";
import { SCE_TOURNAMENT_ROUND_SURFACE_CLASS } from "@/lib/sce/tournament/sce-tournament-surface-layout";
import { buildComposerParticipantFixtureSidePresentation } from "@/lib/tournaments/tournament-participant-presentation";
import { cn } from "@/lib/cn";

type Props = {
  payload: TournamentComposerDraftPayload;
  timelineItems: readonly ComposerSchedulePreviewTimelineItem[];
  summaryLine: string | null;
  tenantClubName: string;
  tenantLogoUrl: string | null;
};

export default function ComposerSchedulePreviewPresentation({
  payload,
  timelineItems,
  summaryLine,
  tenantClubName,
  tenantLogoUrl,
}: Props) {
  return (
    <div className="space-y-4" data-testid="tournament-composer-schedule-preview">
      {summaryLine ? (
        <p className="text-sm text-[var(--text-2)]" data-testid="tournament-composer-schedule-preview-summary">
          {summaryLine}
        </p>
      ) : null}

      <div className="space-y-5" role="list" aria-label="Spielplanvorschau">
        {timelineItems.map((item) => {
          if (item.kind === "BREAK") {
            return (
              <div key={item.breakKey} role="listitem">
                <SceTournamentScheduleBreakPresentation
                  layout="spielplan-all-pitches"
                  label={item.label}
                  timeLabel={item.timeRangeLabel}
                  accessibleLabel={`${item.label} ${item.timeRangeLabel}, ${item.durationMinutes} Minuten`}
                  testId="tournament-composer-schedule-break"
                />
                <p className="mt-1 text-center text-xs text-[var(--muted)]">{item.durationMinutes} Min.</p>
              </div>
            );
          }

          const roundHeadingId = `composer-spielplan-round-${item.roundNumber}`;
          return (
            <section
              key={`round-${item.roundNumber}`}
              role="listitem"
              aria-labelledby={roundHeadingId}
              className={cn(SCE_TOURNAMENT_ROUND_SURFACE_CLASS, "space-y-3")}
              data-testid={`tournament-composer-schedule-round-${item.roundNumber}`}
            >
              <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)] pb-2">
                <h4
                  id={roundHeadingId}
                  className="text-sm font-semibold text-[var(--foreground)]"
                >
                  Runde {item.roundNumber}
                </h4>
                <time
                  className="text-xs font-medium tabular-nums text-[var(--muted)]"
                  dateTime={new Date(item.roundStartUtcMs).toISOString()}
                >
                  {item.roundStartLabel}
                </time>
              </header>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-3.5">
                {item.fixtures.map((fixture) => (
                  <li key={fixture.fixtureKey} className="min-w-0">
                    <SceTournamentSpielplanPreviewFixtureCard
                      fixtureKey={fixture.fixtureKey}
                      pitchLabel={fixture.pitchLabel}
                      playersPerSide={fixture.playersPerSide}
                      sideA={buildComposerParticipantFixtureSidePresentation({
                        participants: payload.participants,
                        participantLocalId: fixture.homeParticipantId,
                        tenantClubName,
                        tenantLogoUrl,
                      })}
                      sideB={buildComposerParticipantFixtureSidePresentation({
                        participants: payload.participants,
                        participantLocalId: fixture.awayParticipantId,
                        tenantClubName,
                        tenantLogoUrl,
                      })}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
