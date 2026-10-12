"use client";

import { SceTrainingCard } from "@/components/sporting-activity/SceTrainingCard";
import { resolveSceTrainingPresentationFromWeekplannerTraining } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-training";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";

type Props = {
  item: WeekplannerTrainingItem;
  timezone: string;
  tenantClubName?: string | null;
  density?: "COMPACT" | "MICRO";
  testId?: string;
};

export function WeekplannerTrainingIdentityCard({
  item,
  timezone,
  tenantClubName,
  density = "COMPACT",
  testId = "weekplanner-training-identity",
}: Props) {
  const model = resolveSceTrainingPresentationFromWeekplannerTraining(item, { tenantClubName });

  return (
    <div data-testid={testId}>
      <SceTrainingCard
        model={model}
        density={density}
        fmtCfg={{ locale: "de-CH", timezone }}
        linkToDetail={false}
        showStatus={false}
        testId="weekplanner-sce-training-card"
      />
    </div>
  );
}
