"use client";

import { SceTournamentCard } from "@/components/sporting-activity/SceTournamentCard";
import { resolveSceTournamentPresentationFromWeekplannerTournament } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-tournament";
import type { WeekplannerTournamentItem } from "@/lib/weekplanner/types";

type Props = {
  item: WeekplannerTournamentItem;
  timezone: string;
  tenantClubName?: string | null;
  density?: "COMPACT" | "MICRO";
  testId?: string;
};

export function WeekplannerTournamentIdentityCard({
  item,
  timezone,
  tenantClubName,
  density = "COMPACT",
  testId = "weekplanner-tournament-identity",
}: Props) {
  const model = resolveSceTournamentPresentationFromWeekplannerTournament(item, { tenantClubName });

  return (
    <div data-testid={testId}>
      <SceTournamentCard
        model={model}
        density={density}
        fmtCfg={{ locale: "de-CH", timezone }}
        linkToDetail={false}
        showStatus={false}
        testId="weekplanner-sce-tournament-card"
      />
    </div>
  );
}
