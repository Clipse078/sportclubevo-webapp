"use client";

import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import { assessMatchOperationalState } from "@/lib/matchcenter/operational-state";
import { resolveSceMatchPresentation } from "@/lib/sporting-activity-presentation/canonical";
import { buildMatchWochenplanerHref } from "@/lib/matchcenter/wochenplaner-deep-links";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import SpieleMatchRowContextMenu from "./SpieleMatchRowContextMenu";
import { cn } from "@/lib/cn";

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
    <article
      className="relative flex min-w-0 flex-col gap-2"
      data-testid={`matchcenter-result-row-${match.id}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <SceMatchCard
            model={scePresentation}
            density="STANDARD"
            fmtCfg={fmtCfg}
            linkToDetail
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
    </article>
  );
}
