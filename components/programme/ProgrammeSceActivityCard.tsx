"use client";

import { SceTrainingCard } from "@/components/sporting-activity/SceTrainingCard";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import { SceTournamentCard } from "@/components/sporting-activity/SceTournamentCard";
import { SceClubEventCard } from "@/components/sporting-activity/SceClubEventCard";
import type { ProgrammeItem } from "@/lib/programme-engine/types";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import {
  isSceClubEventPresentationModel,
  isSceTrainingPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical/types";

const LIST_ROW_CARD_CLASS = "border-0 bg-transparent p-0 shadow-none";

type Props = {
  item: ProgrammeItem;
  fmtCfg: TenantFormatConfig;
  density?: "COMPACT" | "STANDARD";
  testIdPrefix?: string;
};

export default function ProgrammeSceActivityCard({
  item,
  fmtCfg,
  density = "COMPACT",
  testIdPrefix = "programme",
}: Props) {
  const model = item.presentation;
  const testId = `${testIdPrefix}-sce-${item.kind.toLowerCase()}-${item.domainId}`;

  if (item.kind === "TRAINING" && isSceTrainingPresentationModel(model)) {
    return (
      <SceTrainingCard
        model={model}
        density={density}
        fmtCfg={fmtCfg}
        linkToDetail
        showStatus
        surface="list-row"
        className={LIST_ROW_CARD_CLASS}
        testId={testId}
      />
    );
  }

  if (item.kind === "MATCH" && model.kind === "MATCH") {
    return (
      <SceMatchCard
        model={model}
        density={density}
        fmtCfg={fmtCfg}
        linkToDetail
        surface="list-row"
        className={LIST_ROW_CARD_CLASS}
        testId={testId}
      />
    );
  }

  if (item.kind === "TOURNAMENT" && model.kind === "TOURNAMENT") {
    return (
      <SceTournamentCard
        model={model}
        density={density}
        fmtCfg={fmtCfg}
        linkToDetail
        showStatus
        surface="list-row"
        className={LIST_ROW_CARD_CLASS}
        testId={testId}
      />
    );
  }

  if (item.kind === "CLUB_EVENT" && isSceClubEventPresentationModel(model)) {
    return (
      <SceClubEventCard
        model={model}
        density={density}
        fmtCfg={fmtCfg}
        linkToDetail
        showStatus
        surface="list-row"
        className={LIST_ROW_CARD_CLASS}
        testId={testId}
      />
    );
  }

  return null;
}
