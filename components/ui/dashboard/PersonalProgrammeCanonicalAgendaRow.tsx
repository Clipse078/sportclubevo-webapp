"use client";

import { ChevronRight } from "lucide-react";
import { SportingActivityDetailLink } from "@/components/sporting-activity/detail/SportingActivityDetailLink";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { SceTrainingCard } from "@/components/sporting-activity/SceTrainingCard";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import { SceTournamentCard } from "@/components/sporting-activity/SceTournamentCard";
import { SceClubEventCard } from "@/components/sporting-activity/SceClubEventCard";
import { cn } from "@/lib/cn";
import { SceProgrammeActivityCardShell } from "@/components/sporting-activity/SceProgrammeActivityCardShell";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import {
  isSceClubEventPresentationModel,
  isSceMatchPresentationModel,
  isSceTrainingPresentationModel,
  isSceTournamentPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical/types";
import { SCE_PROGRAMME_ACTIVITY_CARD_EMPHASIS_CLASS } from "@/lib/sporting-activity-presentation/canonical/activity-card-programme-shell";

const LIST_ROW_CARD_CLASS = "border-0 bg-transparent p-0 shadow-none";

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
        listRowPresentation="operational"
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
        listRowPresentation="operational"
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
        listRowPresentation="operational"
        className={LIST_ROW_CARD_CLASS}
        testId={`personal-programme-club-event-${item.id}`}
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

  const body = (
    <SceProgrammeActivityCardShell
      density={shellDensity}
      className={cn(highlighted && SCE_PROGRAMME_ACTIVITY_CARD_EMPHASIS_CLASS, className)}
      testId="personal-programme-canonical-agenda-row-shell"
    >
      <div
        className="flex min-w-0 items-start gap-2"
        data-testid="personal-programme-canonical-agenda-row"
      >
        <div className="min-w-0 flex-1">
          <CanonicalAgendaBody item={item} fmtCfg={fmtCfg} density={density} />
        </div>
        {item.deepLink ? (
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
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
