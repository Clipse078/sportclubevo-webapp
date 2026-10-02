"use client";

import Link from "next/link";
import { ActivityTypePill } from "@/components/sporting-activity/ActivityTypePill";
import { ClubIdentityDisplay } from "@/components/sporting-activity/ClubIdentityDisplay";
import { MatchClubPair } from "@/components/sporting-activity/MatchClubPair";
import { SportingActivityLocationLines } from "@/components/sporting-activity/SportingActivityLocationLines";
import { SportingActivityScheduleLine } from "@/components/sporting-activity/SportingActivityScheduleLine";
import { formatSportingActivityCompactPrimaryText } from "@/lib/sporting-activity-presentation/compact";
import {
  resolveSportingActivityCompactAgendaTypeLine,
  formatSportingActivityCompactAgendaContextIndicator,
} from "@/lib/sporting-activity-presentation/compact";
import { formatSportingActivityLocationLines } from "@/lib/sporting-activity-presentation/location";
import type { SportingActivityDetail } from "@/lib/sporting-activity-detail/types";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { formatTime } from "@/lib/tenant-runtime/formatters";
import {
  ActivityDetailInfoList,
  ActivityDetailSection,
} from "./SportingActivityDetailSections";
import { SportingActivityDetailParticipationBlock } from "./SportingActivityDetailParticipation";

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
  const locationLines = formatSportingActivityLocationLines(presentation.location);
  const primaryTitle = formatSportingActivityCompactPrimaryText(presentation);
  const startAt = new Date(presentation.schedule.startAt);
  const endAt = presentation.schedule.endAt ? new Date(presentation.schedule.endAt) : null;

  const headerTypeLabel =
    presentation.identity.activityKind === "TRAINING"
      ? "Training"
      : presentation.identity.activityKind === "MATCH"
        ? "Spiel"
        : "Turnier";

  return (
    <article
      className="min-w-0 space-y-4 pb-2"
      data-testid="sporting-activity-detail-content"
      data-activity-kind={detail.kind}
      data-layout={layout}
    >
      <header className="space-y-3">
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
          <MatchClubPair pair={detail.match.clubPair} density="management" vsLabel="–" />
        ) : null}

        {detail.kind === "TOURNAMENT" && detail.tournament ? (
          <div className="flex flex-col items-start gap-2">
            <ClubIdentityDisplay
              identity={detail.tournament.organiserClubIdentity}
              density="management"
            />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{primaryTitle}</h2>
            {presentation.context?.organiser ? (
              <p className="text-[0.875rem] text-[var(--text-2)]">{presentation.context.organiser}</p>
            ) : null}
          </div>
        ) : (
          <h2 className="text-lg font-semibold leading-snug text-[var(--foreground)]">{primaryTitle}</h2>
        )}

        <SportingActivityScheduleLine
          startAt={startAt}
          endAt={endAt}
          allDay={presentation.schedule.allDay}
          fmtCfg={fmtCfg}
          className="text-[0.9375rem] font-medium text-[var(--foreground)]"
        />

        {typeLine && detail.kind === "TRAINING" ? (
          <p className="sr-only">
            {typeLine.typeLabel}
            {typeLine.contextIndicator ? ` ${typeLine.contextIndicator}` : ""}
          </p>
        ) : null}

        {locationLines.length > 0 ? (
          <div className="space-y-2">
            <SportingActivityLocationLines lines={locationLines} density="standard" />
            {detail.routeTarget ? (
              <Link
                href={detail.routeTarget.href}
                target="_blank"
                rel="noopener noreferrer"
                className="sce-link-primary inline-flex min-h-10 items-center text-[0.875rem] font-medium"
                data-testid="activity-detail-route-link"
              >
                {detail.routeTarget.label}
              </Link>
            ) : null}
          </div>
        ) : null}

        {presentation.context?.competitionLabel ? (
          <p className="text-[0.875rem] text-[var(--text-2)]">{presentation.context.competitionLabel}</p>
        ) : null}
      </header>

      {detail.teamLabel ? (
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
          <ul className="space-y-1">
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
