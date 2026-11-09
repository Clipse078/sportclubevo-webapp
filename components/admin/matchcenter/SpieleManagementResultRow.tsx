"use client";

import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import { assessMatchOperationalState } from "@/lib/matchcenter/operational-state";
import { resolveSceMatchPresentation } from "@/lib/sporting-activity-presentation/canonical";
import { buildMatchWochenplanerHref } from "@/lib/matchcenter/wochenplaner-deep-links";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import { SceProgrammeActivityCardShell } from "@/components/sporting-activity/SceProgrammeActivityCardShell";
import SpieleMatchRowContextMenu from "./SpieleMatchRowContextMenu";

const LIST_ROW_CARD_CLASS = "border-0 bg-transparent p-0 shadow-none";

type Props = {
  match: MatchcenterMatchSummary;
  locale: string;
  timezone: string;
  tenantLogoUrl?: string | null;
  tenantClubName?: string | null;
  canManage: boolean;
};

export default function SpieleManagementResultRow({
  match,
  locale,
  timezone,
  tenantLogoUrl = null,
  tenantClubName = null,
  canManage,
}: Props) {
  const detailHref = `/dashboard/matchcenter/${match.id}`;
  const assessment = assessMatchOperationalState(match);
  const fmtCfg = { locale, timezone };
  const scePresentation = resolveSceMatchPresentation({
    match,
    tenantLogoUrl,
    tenantClubName,
    assessment,
    timezone,
  });
  const wochenplanerHref = buildMatchWochenplanerHref({
    startAt: match.startAt,
    teamId: match.teamId,
    timezone,
  });

  return (
    <SceProgrammeActivityCardShell
      density="STANDARD"
      className="relative min-w-0 w-full"
      data-testid={`matchcenter-result-row-${match.id}`}
      data-sce-activity-card-layout="horizontal-full-width"
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <SceMatchCard
            model={scePresentation}
            density="STANDARD"
            fmtCfg={fmtCfg}
            linkToDetail
            surface="list-row"
            listRowPresentation="programme-fixture"
            scopeTeamId={match.teamId}
            className={LIST_ROW_CARD_CLASS}
            testId={`matchcenter-result-sce-match-${match.id}`}
          />
        </div>
        <div className="relative z-[2] shrink-0 pt-1">
          <SpieleMatchRowContextMenu
            matchId={match.id}
            detailHref={detailHref}
            wochenplanerHref={wochenplanerHref}
            canManage={canManage}
            showResultAction
          />
        </div>
      </div>
    </SceProgrammeActivityCardShell>
  );
}
