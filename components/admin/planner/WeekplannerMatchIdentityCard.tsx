"use client";

import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import { resolveSceMatchPresentationFromWeekplannerMatch } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-match";
import type { WeekplannerMatchItem } from "@/lib/weekplanner/types";

type Props = {
  item: WeekplannerMatchItem;
  timezone: string;
  testId?: string;
};

export function WeekplannerMatchIdentityCard({
  item,
  timezone,
  testId = "weekplanner-match-identity",
}: Props) {
  const model = resolveSceMatchPresentationFromWeekplannerMatch(item, { timezone });

  return (
    <div data-testid={testId}>
      <SceMatchCard
        model={model}
        density="COMPACT"
        fmtCfg={{ locale: "de-CH", timezone }}
        linkToDetail={false}
        testId="weekplanner-sce-match-card"
      />
    </div>
  );
}
