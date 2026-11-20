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
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";

type Props = {
  permissionKeys: string[];
  hasPlanningAccess: boolean;
  orgEinheitFilterLabel?: string | null;
  strategies: ClubStrategyListItemDto[];
  selectedStrategyId: string | null;
  authoring: ClubStrategyAuthoringDto | null;
  canManageTargets: boolean;
  canCreateTargetTasks: boolean;
  targets: StrategyTargetOverview[];
  focusTargetIds: string[];
  availableMeetings: EntityRef[];
  availableDecisions: EntityRef[];
  orgUnitOptions: TaskOrgUnitPickerOption[];
  timeZone: string;
};

export default function StrategieUndZieleWorkspaceClient({
  permissionKeys,
  hasPlanningAccess,
  orgEinheitFilterLabel = null,
  strategies,
  selectedStrategyId,
  authoring,
  canManageTargets,
  canCreateTargetTasks,
  targets,
  focusTargetIds,
  availableMeetings,
  availableDecisions,
  orgUnitOptions,
  timeZone,
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
      />

      <div hidden={activeView !== "strategie"} aria-hidden={activeView !== "strategie"} className="space-y-4">
        <StrategienWorkspaceListPanel
          strategies={strategies}
          selectedStrategyId={selectedStrategyId}
          canManage={canManageTargets}
          orgUnitOptions={orgUnitOptions}
          orgEinheitFilterLabel={orgEinheitFilterLabel}
          timeZone={timeZone}
        />
        {selectedStrategyId ? (
          authoring ? (
            <StrategyAuthoringPanel
              initial={authoring}
              canManage={canManageTargets}
              targets={targets}
              availableMeetings={availableMeetings}
              availableDecisions={availableDecisions}
              orgUnitOptions={orgUnitOptions}
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">Strategie konnte nicht geladen werden.</p>
          )
        ) : null}
      </div>

      <div hidden={activeView !== "ziele"} aria-hidden={activeView !== "ziele"}>
        <ZieleWorkspacePanel
          targets={targets}
          strategies={strategies}
          focusTargetIds={focusSet}
          canManageTargets={canManageTargets}
          canCreateTargetTasks={canCreateTargetTasks}
          orgEinheitFilterLabel={orgEinheitFilterLabel}
        />
      </div>
    </SceContextDirtyGuardProvider>
  );
}