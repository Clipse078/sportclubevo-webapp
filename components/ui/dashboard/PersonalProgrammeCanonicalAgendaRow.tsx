"use client";

import { ChevronRight } from "lucide-react";
import { SportingActivityDetailLink } from "@/components/sporting-activity/detail/SportingActivityDetailLink";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { SceTrainingCard } from "@/components/sporting-activity/SceTrainingCard";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import { SceTournamentCard } from "@/components/sporting-activity/SceTournamentCard";
import { SceClubEventCard } from "@/components/sporting-activity/SceClubEventCard";
import { SceMeetingCard } from "@/components/sporting-activity/SceMeetingCard";
import { cn } from "@/lib/cn";
import { SceProgrammeActivityCardShell } from "@/components/sporting-activity/SceProgrammeActivityCardShell";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import {
  isSceClubEventPresentationModel,
  isSceMatchPresentationModel,
  isSceMeetingPresentationModel,
  isSceTrainingPresentationModel,
  isSceTournamentPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical/types";
import { SCE_PROGRAMME_ACTIVITY_CARD_EMPHASIS_CLASS } from "@/lib/sporting-activity-presentation/canonical/activity-card-programme-shell";
import { SceProgrammeActivityDateTile } from "@/components/sporting-activity/SceProgrammeActivityDateTile";
import { SCE_ACTIVITY_REFERENCE_LAYOUT } from "@/lib/sporting-activity-presentation/canonical/activity-card-reference-layout";
import type { SceActivityPresentationModel } from "@/lib/sporting-activity-presentation/canonical/types";

const LIST_ROW_CARD_CLASS = "border-0 bg-transparent p-0 shadow-none";
const PERSONAL_LIST_ROW = "programme-personal" as const;

function resolveCanonicalScheduleStartAt(
  model: SceActivityPresentationModel,
  item: PersonalProgrammeItem,
): Date {
  const scheduleStart = "schedule" in model ? model.schedule?.startAt : undefined;
  if (scheduleStart) {
    const parsed = new Date(scheduleStart);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return item.startsAt;
}

const DEFAULT_FMT_CFG: TenantFormatConfig = {
  locale: "de-CH",
  timezone: "Europe/Zurich",
};

export type PersonalProgrammeCanonicalAgendaRowProps = {
  item: PersonalProgrammeItem;
  highlighted?: boolean;
  className?: string;
  fmtCfg?: TenantFormatConfig;
  density?: "COMPACT" | "STANDARD";
};

function CanonicalAgendaBody({
  item,
  fmtCfg,
  density = "COMPACT",
}: {
  item: PersonalProgrammeItem;
  fmtCfg: TenantFormatConfig;
  density?: "COMPACT" | "STANDARD";
}) {
  const model = item.canonicalPresentation;
  if (!model) return null;

  if (isSceTrainingPresentationModel(model)) {
    return (
      <SceTrainingCard
        model={model}
        density={density}
        fmtCfg={fmtCfg}
        linkToDetail={false}
        showStatus
        surface="list-row"
        listRowPresentation={PERSONAL_LIST_ROW}
        className={LIST_ROW_CARD_CLASS}
        testId={`personal-programme-training-${item.id}`}
      />
    );
  }

  if (isSceMatchPresentationModel(model)) {
    return (
      <SceMatchCard
        model={model}
        density={density}
        fmtCfg={fmtCfg}
        linkToDetail={false}
        surface="list-row"
        listRowPresentation="programme-fixture"
        scopeTeamId={item.programmeScopeTeamId}
        className={LIST_ROW_CARD_CLASS}
        testId={`personal-programme-match-${item.id}`}
      />
    );
  }

  if (isSceTournamentPresentationModel(model)) {
    return (
      <SceTournamentCard
        model={model}
        density={density}
        fmtCfg={fmtCfg}
        linkToDetail={false}
        showStatus
        surface="list-row"
        listRowPresentation={PERSONAL_LIST_ROW}
        className={LIST_ROW_CARD_CLASS}
        testId={`personal-programme-tournament-${item.id}`}
      />
    );
  }

  if (isSceClubEventPresentationModel(model)) {
    return (
      <SceClubEventCard
        model={model}
        density={density}
        fmtCfg={fmtCfg}
        linkToDetail={false}
        showStatus
        surface="list-row"
        listRowPresentation={PERSONAL_LIST_ROW}
        className={LIST_ROW_CARD_CLASS}
        testId={`personal-programme-club-event-${item.id}`}
      />
    );
  }

  if (isSceMeetingPresentationModel(model)) {
    return (
      <SceMeetingCard
        model={model}
        density={density}
        fmtCfg={fmtCfg}
        linkToDetail={false}
        surface="list-row"
        listRowPresentation={PERSONAL_LIST_ROW}
        className={LIST_ROW_CARD_CLASS}
        testId={`personal-programme-meeting-${item.id}`}
      />
    );
  }

  return null;
}

/**
 * Dashboard Mein Programm row — canonical SCE activity list-row density (01I semantics).
 */
export function PersonalProgrammeCanonicalAgendaRow({
  item,
  highlighted = false,
  className,
  fmtCfg = DEFAULT_FMT_CFG,
  density = "COMPACT",
}: PersonalProgrammeCanonicalAgendaRowProps) {
  const shellDensity = density === "COMPACT" ? "COMPACT" : "STANDARD";

  const model = item.canonicalPresentation;
  const scheduleStartAt = model ? resolveCanonicalScheduleStartAt(model, item) : item.startsAt;

  const body = (
    <SceProgrammeActivityCardShell
      density={shellDensity}
      className={cn(highlighted && SCE_PROGRAMME_ACTIVITY_CARD_EMPHASIS_CLASS, className)}
      testId="personal-programme-canonical-agenda-row-shell"
    >
      <div
        className={cn(SCE_ACTIVITY_REFERENCE_LAYOUT.programmePersonalAgendaShellClass, "items-start")}
        data-testid="personal-programme-canonical-agenda-row"
        data-sce-programme-personal-agenda-row
      >
        <SceProgrammeActivityDateTile startAt={scheduleStartAt} fmtCfg={fmtCfg} />
        <div className="min-w-0 flex-1 self-stretch">
          <CanonicalAgendaBody item={item} fmtCfg={fmtCfg} density={density} />
        </div>
        {item.deepLink ? (
          <ChevronRight
            className="mt-1 h-4 w-4 shrink-0 self-center text-[var(--muted)]"
            aria-hidden
          />
        ) : null}
      </div>
    </SceProgrammeActivityCardShell>
  );

  if (item.deepLink) {
    return (
      <SportingActivityDetailLink
        href={item.deepLink}
        className="block rounded-xl no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        aria-label={item.ariaLabel}
      >
        {body}
      </SportingActivityDetailLink>
    );
  }

  return (
    <div aria-label={item.ariaLabel} className="block">
      {body}
    </div>
  );
}
