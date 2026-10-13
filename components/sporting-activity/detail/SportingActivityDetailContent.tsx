"use client";

import { ActivityTypePill } from "@/components/sporting-activity/ActivityTypePill";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import { SceTrainingCard } from "@/components/sporting-activity/SceTrainingCard";
import { SceTournamentCard } from "@/components/sporting-activity/SceTournamentCard";
import { resolveSceActivityPresentationFromDetail } from "@/lib/sporting-activity-detail/resolve-canonical-presentation";
import {
  isSceMatchPresentationModel,
  isSceTrainingPresentationModel,
  isSceTournamentPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical/types";
import { formatSportingActivityCompactPrimaryText } from "@/lib/sporting-activity-presentation/compact";
import {
  resolveSportingActivityCompactAgendaTypeLine,
  formatSportingActivityCompactAgendaContextIndicator,
} from "@/lib/sporting-activity-presentation/compact";
import { formatSportingActivityDetailLocationLines } from "@/lib/sporting-activity-detail/detail-location";
import { formatSportingActivityDetailScheduleParts } from "@/lib/sporting-activity-detail/detail-schedule";
import type { SportingActivityDetail } from "@/lib/sporting-activity-detail/types";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { formatTime } from "@/lib/tenant-runtime/formatters";
import {
  ActivityDetailInfoList,
  ActivityDetailSection,
} from "./SportingActivityDetailSections";
import { SportingActivityDetailParticipationBlock } from "./SportingActivityDetailParticipation";
import {
  ActivityDetailLocationBlock,
  ActivityDetailScheduleGroup,
  ActivityDetailTeamRow,
} from "./ActivityDetailBlocks";

const MEIN_PROGRAMM_CONTRACT = { meinProgrammContract: true as const };

export type SportingActivityDetailContentProps = {
  detail: SportingActivityDetail;
  fmtCfg: TenantFormatConfig;
  onParticipationUpdated?: () => void;
  layout?: "sheet" | "page";
};

export function SportingActivityDetailContent({
  detail,
  fmtCfg,
  onParticipationUpdated,
  layout = "sheet",
}: SportingActivityDetailContentProps) {
  const { presentation } = detail;
  const typeLine = resolveSportingActivityCompactAgendaTypeLine(
    presentation,
    MEIN_PROGRAMM_CONTRACT,
  );
  const contextIndicator = formatSportingActivityCompactAgendaContextIndicator(
    presentation,
    MEIN_PROGRAMM_CONTRACT,
  );
  const primaryTitle = formatSportingActivityCompactPrimaryText(presentation);
  const startAt = new Date(presentation.schedule.startAt);
  const endAt = presentation.schedule.endAt ? new Date(presentation.schedule.endAt) : null;

  const scheduleParts = formatSportingActivityDetailScheduleParts({
    startAt,
    endAt,
    allDay: presentation.schedule.allDay,
    fmtCfg,
  });

  const headerTypeLabel =
    presentation.identity.activityKind === "TRAINING"
      ? "Training"
      : presentation.identity.activityKind === "MATCH"
        ? "Spiel"
        : "Turnier";

  const heroLocationLines = formatSportingActivityDetailLocationLines(presentation.location, {
    includeHomeClub: detail.kind === "TRAINING",
    omitHostOrOrganiser: detail.kind === "TOURNAMENT",
  });

  const ortLocationLines =
    detail.kind === "MATCH" || detail.kind === "TOURNAMENT"
      ? formatSportingActivityDetailLocationLines(presentation.location, {
          omitHostOrOrganiser: true,
        })
      : heroLocationLines;

  const showOrtSection =
    (detail.kind === "MATCH" || detail.kind === "TOURNAMENT") && ortLocationLines.length > 0;

  return (
    <article
      className="min-w-0 space-y-5 pb-4 text-[var(--foreground)]"
      data-testid="sporting-activity-detail-content"
      data-activity-kind={detail.kind}
      data-layout={layout}
    >
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ActivityTypePill
            activityKind={presentation.identity.activityKind}
            label={headerTypeLabel}
          />
          {contextIndicator ? (
            <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--text-2)]">
              {contextIndicator}
            </span>
          ) : null}
        </div>

        {detail.kind === "MATCH" && detail.match ? (
          <SceMatchCard
            model={(() => {
              if (detail.match.scePresentation) {
                return detail.match.scePresentation;
              }
              const resolved = resolveSceActivityPresentationFromDetail(detail);
              if (!isSceMatchPresentationModel(resolved)) {
                throw new Error("Expected MATCH presentation model");
              }
              return resolved;
            })()}
            density="HERO"
            fmtCfg={fmtCfg}
            linkToDetail={false}
            surface="detail-embed"
            testId="sporting-activity-detail-match-card"
          />
        ) : null}

        {detail.kind === "TRAINING" ? (
          <SceTrainingCard
            model={(() => {
              const resolved = resolveSceActivityPresentationFromDetail(detail);
              if (!isSceTrainingPresentationModel(resolved)) {
                throw new Error("Expected TRAINING presentation model");
              }
              return resolved;
            })()}
            density="HERO"
            fmtCfg={fmtCfg}
            linkToDetail={false}
            surface="detail-embed"
            testId="sporting-activity-detail-training-card"
          />
        ) : null}

        {detail.kind === "TOURNAMENT" && detail.tournament ? (
          <SceTournamentCard
            model={(() => {
              const resolved = resolveSceActivityPresentationFromDetail(detail);
              if (!isSceTournamentPresentationModel(resolved)) {
                throw new Error("Expected TOURNAMENT presentation model");
              }
              return resolved;
            })()}
            density="HERO"
            fmtCfg={fmtCfg}
            linkToDetail={false}
            surface="detail-embed"
            testId="sporting-activity-detail-tournament-card"
          />
        ) : detail.kind !== "MATCH" && detail.kind !== "TRAINING" ? (
          <h2 className="text-xl font-semibold leading-snug tracking-tight">{primaryTitle}</h2>
        ) : null}

        <ActivityDetailScheduleGroup parts={scheduleParts} />

        {typeLine && detail.kind === "TRAINING" ? (
          <p className="sr-only">
            {typeLine.typeLabel}
            {typeLine.contextIndicator ? ` ${typeLine.contextIndicator}` : ""}
          </p>
        ) : null}

        {detail.kind === "TRAINING" ? (
          <ActivityDetailLocationBlock
            lines={heroLocationLines}
            routeTarget={detail.routeTarget}
          />
        ) : null}

        {presentation.context?.competitionLabel && detail.kind === "MATCH" ? (
          <p className="text-[0.9375rem] font-medium text-[var(--text-2)]">
            {presentation.context.competitionLabel}
          </p>
        ) : null}

        {showOrtSection ? (
          <ActivityDetailLocationBlock
            lines={ortLocationLines}
            routeTarget={detail.routeTarget}
            showOrtLabel
          />
        ) : null}
      </header>

      {detail.participantTeam ? (
        <ActivityDetailSection title="Mein Team" className="!border-t-[var(--border)]">
          <ActivityDetailTeamRow participantTeam={detail.participantTeam} />
        </ActivityDetailSection>
      ) : detail.teamLabel ? (
        <ActivityDetailSection title="Mein Team">
          <p className="text-[0.9375rem] font-medium text-[var(--foreground)]">{detail.teamLabel}</p>
        </ActivityDetailSection>
      ) : null}

      {detail.meetingAt ? (
        <ActivityDetailSection title="Treffpunkt">
          <p className="font-mono text-[0.9375rem] tabular-nums text-[var(--foreground)]">
            {formatTime(new Date(detail.meetingAt), fmtCfg)}
          </p>
        </ActivityDetailSection>
      ) : null}

      {detail.participation ? (
        <ActivityDetailSection title="Meine Teilnahme">
          <SportingActivityDetailParticipationBlock
            participation={detail.participation}
            onUpdated={onParticipationUpdated}
          />
        </ActivityDetailSection>
      ) : null}

      {detail.training?.trainers && detail.training.trainers.length > 0 ? (
        <ActivityDetailSection title="Trainer">
          <ul className="space-y-1.5">
            {detail.training.trainers.map((trainer) => (
              <li key={`${trainer.name}-${trainer.roleLabel ?? ""}`} className="text-[0.875rem]">
                <span className="font-medium text-[var(--foreground)]">{trainer.name}</span>
                {trainer.roleLabel ? (
                  <span className="text-[var(--text-2)]"> · {trainer.roleLabel}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </ActivityDetailSection>
      ) : null}

      {detail.tournament && detail.tournament.tournamentInfo.length > 0 ? (
        <ActivityDetailSection title="Turnierinfo">
          <ActivityDetailInfoList items={detail.tournament.tournamentInfo} />
        </ActivityDetailSection>
      ) : null}

      {detail.participantInformation && detail.participantInformation.length > 0 ? (
        <ActivityDetailSection title="Informationen">
          <ActivityDetailInfoList items={detail.participantInformation} />
        </ActivityDetailSection>
      ) : null}

      <p className="sr-only">{headerTypeLabel}</p>
    </article>
  );
}
