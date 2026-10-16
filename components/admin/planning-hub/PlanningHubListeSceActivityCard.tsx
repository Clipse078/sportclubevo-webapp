"use client";

import type { ReactNode } from "react";
import { SceTrainingCard } from "@/components/sporting-activity/SceTrainingCard";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import { SceTournamentCard } from "@/components/sporting-activity/SceTournamentCard";
import { SceClubEventCard } from "@/components/sporting-activity/SceClubEventCard";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { resolveSceTrainingPresentationFromWeekplannerTraining } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-training";
import { resolveSceMatchPresentationFromWeekplannerMatch } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-match";
import { resolveSceTournamentPresentationFromWeekplannerTournament } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-tournament";
import { resolveSceClubEventPresentationFromWeekplannerVeranstaltung } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-veranstaltung";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

const LIST_ROW_CARD_CLASS = "border-0 bg-transparent p-0 shadow-none";

type Props = {
  item: WeekplannerItem;
  fmtCfg: TenantFormatConfig;
  density?: "COMPACT" | "STANDARD";
  tenantClubName?: string | null;
  tenantLogoUrl?: string | null;
  testIdPrefix?: string;
  /** Planner operational issue summary rendered inside the canonical shell. */
  issueSummary?: ReactNode;
};

/**
 * Canonical SCE activity cards for Wochenplaner Liste — same family as `/dashboard/programm`.
 */
export default function PlanningHubListeSceActivityCard({
  item,
  fmtCfg,
  density = "STANDARD",
  tenantClubName,
  tenantLogoUrl,
  testIdPrefix = "planning-hub-liste",
  issueSummary,
}: Props) {
  const kindKey =
    item.type === "VERANSTALTUNG"
      ? "club-event"
      : item.type === "TRAINING"
        ? "training"
        : item.type === "MATCH"
          ? "match"
          : "tournament";
  const testId = `${testIdPrefix}-sce-${kindKey}-${item.id}`;

  const card = (() => {
    switch (item.type) {
      case "TRAINING":
        return (
          <SceTrainingCard
            model={resolveSceTrainingPresentationFromWeekplannerTraining(item, { tenantClubName })}
            density={density}
            fmtCfg={fmtCfg}
            linkToDetail={false}
            showStatus={false}
            surface="list-row"
            listRowPresentation="operational"
            className={LIST_ROW_CARD_CLASS}
            testId={testId}
          />
        );
      case "MATCH":
        return (
          <SceMatchCard
            model={resolveSceMatchPresentationFromWeekplannerMatch(item, {
              timezone: fmtCfg.timezone ?? "Europe/Zurich",
            })}
            density={density}
            fmtCfg={fmtCfg}
            linkToDetail={false}
            surface="list-row"
            listRowPresentation="programme-fixture"
            className={LIST_ROW_CARD_CLASS}
            testId={testId}
          />
        );
      case "TOURNAMENT":
        return (
          <SceTournamentCard
            model={resolveSceTournamentPresentationFromWeekplannerTournament(item, { tenantClubName })}
            density={density}
            fmtCfg={fmtCfg}
            linkToDetail={false}
            showStatus={false}
            surface="list-row"
            listRowPresentation="operational"
            className={LIST_ROW_CARD_CLASS}
            testId={testId}
          />
        );
      case "VERANSTALTUNG":
        return (
          <SceClubEventCard
            model={resolveSceClubEventPresentationFromWeekplannerVeranstaltung(item, {
              tenantClubName,
              tenantLogoUrl,
            })}
            density={density}
            fmtCfg={fmtCfg}
            linkToDetail={false}
            showStatus={false}
            surface="list-row"
            listRowPresentation="operational"
            className={LIST_ROW_CARD_CLASS}
            testId={testId}
          />
        );
      default: {
        const exhaustive: never = item;
        return exhaustive;
      }
    }
  })();

  return (
    <div className="min-w-0 space-y-1" data-sce-planning-hub-liste-card-body>
      {card}
      {issueSummary}
    </div>
  );
}
