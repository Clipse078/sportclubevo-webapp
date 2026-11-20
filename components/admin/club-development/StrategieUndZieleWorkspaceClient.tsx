"use client";

import { useSearchParams } from "next/navigation";
import type {
  ClubStrategyAuthoringDto,
  ClubStrategyListItemDto,
} from "@/lib/club-development/club-strategy-service";
import StrategienWorkspaceListPanel from "./StrategienWorkspaceListPanel";
import type { StrategyTargetOverview } from "@/lib/club-development/strategy-overview";
import type { EntityRef } from "@/lib/linking/types";
import StrategyAuthoringPanel from "./StrategyAuthoringPanel";
import ZieleWorkspacePanel from "./ZieleWorkspacePanel";
import VereinsentwicklungConnectedWorkspaceNav from "./VereinsentwicklungConnectedWorkspaceNav";
import { SceContextDirtyGuardProvider } from "@/lib/context-tabs";
import { parseStrategieZieleView } from "@/lib/club-development/vereinsentwicklung-workspace-routing";

type Props = {
  permissionKeys: string[];
  hasPlanningAccess: boolean;
  orgEinheitFilterLabel?: string | null;
  strategies: ClubStrategyListItemDto[];
  selectedStrategyId: string | null;
  authoring: ClubStrategyAuthoringDto | null;
  canManageTargets: boolean;
  targets: StrategyTargetOverview[];
  focusTargetIds: string[];
  availableMeetings: EntityRef[];
  availableDecisions: EntityRef[];
};

export default function StrategieUndZieleWorkspaceClient({
  permissionKeys,
  hasPlanningAccess,
  orgEinheitFilterLabel = null,
  strategies,
  selectedStrategyId,
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

  return (
    <SceContextDirtyGuardProvider>
      <VereinsentwicklungConnectedWorkspaceNav
        permissionKeys={permissionKeys}
        hasPlanningAccess={hasPlanningAccess}
        activeView={activeView === "ziele" ? "ziele" : "strategien"}
        orgEinheitFilterLabel={orgEinheitFilterLabel}
      />

      <div hidden={activeView !== "strategie"} aria-hidden={activeView !== "strategie"} className="space-y-4">
        <StrategienWorkspaceListPanel
          strategies={strategies}
          selectedStrategyId={selectedStrategyId}
        />
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