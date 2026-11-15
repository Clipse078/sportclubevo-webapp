"use client";

import { useSearchParams } from "next/navigation";
import type { ClubStrategyAuthoringDto } from "@/lib/club-development/club-strategy-service";
import type { StrategyTargetOverview } from "@/lib/club-development/strategy-overview";
import type { EntityRef } from "@/lib/linking/types";
import StrategyAuthoringPanel from "./StrategyAuthoringPanel";
import ZieleWorkspacePanel from "./ZieleWorkspacePanel";
import VereinsentwicklungWorkspaceViewNav from "./VereinsentwicklungWorkspaceViewNav";
import { SceContextDirtyGuardProvider } from "@/lib/context-tabs";
import {
  buildStrategieUndZieleHref,
  CD_STRATEGIE_ZIELE_VIEWS,
  CD_STRATEGIE_ZIELE_VIEW_LABELS,
  parseStrategieZieleView,
} from "@/lib/club-development/vereinsentwicklung-workspace-routing";

type Props = {
  authoring: ClubStrategyAuthoringDto | null;
  canManageTargets: boolean;
  targets: StrategyTargetOverview[];
  focusTargetIds: string[];
  availableMeetings: EntityRef[];
  availableDecisions: EntityRef[];
};

export default function StrategieUndZieleWorkspaceClient({
  authoring,
  canManageTargets,
  targets,
  focusTargetIds,
  availableMeetings,
  availableDecisions,
}: Props) {
  const searchParams = useSearchParams();
  const activeView = parseStrategieZieleView(searchParams.get("ansicht"));
  const focusSet = new Set(focusTargetIds);

  const buildHref = (view: (typeof CD_STRATEGIE_ZIELE_VIEWS)[number]) => {
    const params: Record<string, string | undefined> = {};
    searchParams.forEach((value, key) => {
      if (key !== "ansicht") params[key] = value;
    });
    return buildStrategieUndZieleHref(view, params);
  };

  return (
    <SceContextDirtyGuardProvider>
      <VereinsentwicklungWorkspaceViewNav
        views={CD_STRATEGIE_ZIELE_VIEWS}
        labels={CD_STRATEGIE_ZIELE_VIEW_LABELS}
        activeView={activeView}
        buildHref={buildHref}
        testId="strategie-ziele-view-nav"
      />

      <div hidden={activeView !== "strategie"} aria-hidden={activeView !== "strategie"}>
        {authoring ? (
          <StrategyAuthoringPanel
            initial={authoring}
            canManage={canManageTargets}
            targets={targets}
            availableMeetings={availableMeetings}
            availableDecisions={availableDecisions}
          />
        ) : (
          <p className="text-sm text-[var(--muted)]">Strategie konnte nicht geladen werden.</p>
        )}
      </div>

      <div hidden={activeView !== "ziele"} aria-hidden={activeView !== "ziele"}>
        <ZieleWorkspacePanel
          targets={targets}
          focusTargetIds={focusSet}
          canManageTargets={canManageTargets}
        />
      </div>
    </SceContextDirtyGuardProvider>
  );
}