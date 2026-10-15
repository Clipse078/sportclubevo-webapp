"use client";

import { ChevronRight } from "lucide-react";
import { SportingActivityDetailLink } from "@/components/sporting-activity/detail/SportingActivityDetailLink";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { SceTrainingCard } from "@/components/sporting-activity/SceTrainingCard";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import { SceTournamentCard } from "@/components/sporting-activity/SceTournamentCard";
import { SceClubEventCard } from "@/components/sporting-activity/SceClubEventCard";
import { cn } from "@/lib/cn";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import {
  isSceClubEventPresentationModel,
  isSceMatchPresentationModel,
  isSceTrainingPresentationModel,
  isSceTournamentPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical/types";

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
};

function CanonicalAgendaBody({
  item,
  fmtCfg,
}: {
  item: PersonalProgrammeItem;
  fmtCfg: TenantFormatConfig;
}) {
  const model = item.canonicalPresentation;
  if (!model) return null;

  if (isSceTrainingPresentationModel(model)) {
    return (
      <SceTrainingCard
        model={model}
        density="COMPACT"
        fmtCfg={fmtCfg}
        linkToDetail={false}
        showStatus
        surface="list-row"
        listRowPresentation="dashboard-agenda"
        className={LIST_ROW_CARD_CLASS}
        testId={`personal-programme-training-${item.id}`}
      />
    );
  }

  if (isSceMatchPresentationModel(model)) {
    return (
      <SceMatchCard
        model={model}
        density="COMPACT"
        fmtCfg={fmtCfg}
        linkToDetail={false}
        surface="list-row"
        listRowPresentation="dashboard-opponent"
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
        density="COMPACT"
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
        density="COMPACT"
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
}: PersonalProgrammeCanonicalAgendaRowProps) {
  const body = (
    <div
      className={cn(
        "flex min-w-0 items-start gap-2 py-2",
        highlighted &&
          "rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--sce-primary)_8%,transparent)] px-1",
        className,
      )}
      data-testid="personal-programme-canonical-agenda-row"
    >
      <div className="min-w-0 flex-1">
        <CanonicalAgendaBody item={item} fmtCfg={fmtCfg} />
      </div>
      {item.deepLink ? (
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
      ) : null}
    </div>
  );

  if (item.deepLink) {
    return (
      <SportingActivityDetailLink
        href={item.deepLink}
        className="block rounded-[var(--radius-md)] no-underline motion-safe:transition-colors motion-safe:hover:bg-[color-mix(in_srgb,var(--surface-2)_45%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
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
