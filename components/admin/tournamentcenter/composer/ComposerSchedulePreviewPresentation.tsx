"use client";

import SceTournamentFixtureCompactMatchup from "@/components/sce/tournament/SceTournamentFixtureCompactMatchup";
import SceTournamentScheduleBreakPresentation from "@/components/sce/tournament/SceTournamentScheduleBreakPresentation";
import type { TournamentComposerDraftPayload } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import type { ComposerSchedulePreviewTimelineItem } from "@/lib/tournaments/composer/build-composer-schedule-preview-timeline";
import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";
import { SCE_TOURNAMENT_FIXTURE_COMPACT_SHELL_CLASS } from "@/lib/sce/tournament/sce-tournament-surface-layout";
import { SCE_TOURNAMENT_ROUND_SURFACE_CLASS } from "@/lib/sce/tournament/sce-tournament-surface-layout";
import { cn } from "@/lib/cn";

function participantSide(
  payload: TournamentComposerDraftPayload,
  participantId: string,
): TournamentPlanungFixtureSidePresentation {
  const row = payload.participants.find((p) => p.localId === participantId);
  return {
    label: row?.displayName?.trim() || participantId,
    crestUrl: row?.externalClubLogoUrl ?? null,
    isPlaceholder: false,
    participantId,
    qualificationProvenanceLabel: null,
  };
}

function playingFormatLabel(playersPerSide: number | null): string | null {
  if (playersPerSide == null || playersPerSide <= 0) return null;
  return `${playersPerSide}v${playersPerSide}`;
}

type Props = {
  payload: TournamentComposerDraftPayload;
  timelineItems: readonly ComposerSchedulePreviewTimelineItem[];
  summaryLine: string | null;
};

export default function ComposerSchedulePreviewPresentation({
  payload,
  timelineItems,
  summaryLine,
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
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-3.5">
                {item.fixtures.map((fixture) => {
                  const formatLabel = playingFormatLabel(fixture.playersPerSide);
                  return (
                    <li
                      key={fixture.fixtureKey}
                      className={cn(SCE_TOURNAMENT_FIXTURE_COMPACT_SHELL_CLASS, "space-y-2 p-3")}
                      data-testid={`tournament-composer-schedule-fixture-${fixture.fixtureKey}`}
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-2)]">
                        <span className="font-medium text-[var(--foreground)]">{fixture.pitchLabel}</span>
                        {formatLabel ? (
                          <>
                            <span aria-hidden className="text-[var(--muted)]">
                              ·
                            </span>
                            <span>{formatLabel}</span>
                          </>
                        ) : null}
                      </div>
                      <SceTournamentFixtureCompactMatchup
                        layout="board"
                        sideA={participantSide(payload, fixture.homeParticipantId)}
                        sideB={participantSide(payload, fixture.awayParticipantId)}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
