"use client";

import { useSearchParams } from "next/navigation";
import type { VorhabenWorkspaceSnapshot } from "@/lib/club-development/vorhaben-workspace";
import InitiativeBacklogWorkspace from "./InitiativeBacklogWorkspace";
import VorhabenAufgabenWorkspace from "./VorhabenAufgabenWorkspace";
import UmsetzungsplanungWorkspace from "./UmsetzungsplanungWorkspace";
import type { UmsetzungsplanungPhaseCardItem } from "./UmsetzungsplanungPhaseCard";
import VereinsentwicklungWorkspaceViewNav from "./VereinsentwicklungWorkspaceViewNav";
import {
  buildVorhabenUndUmsetzungHref,
  CD_VORHABEN_UMSETZUNG_VIEWS,
  CD_VORHABEN_UMSETZUNG_VIEW_LABELS,
  CD_WORKSPACE_PRIORITAETEN_QUERY,
  parseVorhabenUmsetzungView,
} from "@/lib/club-development/vereinsentwicklung-workspace-routing";

type BacklogRow = React.ComponentProps<typeof InitiativeBacklogWorkspace>["initialInitiatives"][number];

type FilterTarget = {
  id: string;
  title: string;
};

type Props = {
  snapshot: VorhabenWorkspaceSnapshot;
  initialTargetId: string | null;
  initialInitiativeId: string | null;
  backlogInitiatives: BacklogRow[];
  backlogCanManage: boolean;
  backlogCanView: boolean;
  backlogTargetId: string | null;
  filterTarget: FilterTarget | null;
  sprints: UmsetzungsplanungPhaseCardItem[];
  canManageSprints: boolean;
  showPrioritaetenDefault: boolean;
};

export default function VorhabenUndUmsetzungWorkspaceClient({
  snapshot,
  initialTargetId,
  initialInitiativeId,
  backlogInitiatives,
  backlogCanManage,
  backlogCanView,
  backlogTargetId,
  filterTarget,
  sprints,
  canManageSprints,
  showPrioritaetenDefault,
}: Props) {
  const searchParams = useSearchParams();
  const activeView = parseVorhabenUmsetzungView(searchParams.get("ansicht"));
  const showPrioritaeten =
    searchParams.get(CD_WORKSPACE_PRIORITAETEN_QUERY) === "1" || showPrioritaetenDefault;

  const buildHref = (view: (typeof CD_VORHABEN_UMSETZUNG_VIEWS)[number]) => {
    const params: Record<string, string | undefined> = {};
    searchParams.forEach((value, key) => {
      if (key !== "ansicht") params[key] = value;
    });
    return buildVorhabenUndUmsetzungHref(view, params);
  };

  return (
    <>
      <VereinsentwicklungWorkspaceViewNav
        views={CD_VORHABEN_UMSETZUNG_VIEWS}
        labels={CD_VORHABEN_UMSETZUNG_VIEW_LABELS}
        activeView={activeView}
        buildHref={buildHref}
        testId="vorhaben-umsetzung-view-nav"
      />
      <div hidden={activeView !== "vorhaben"} aria-hidden={activeView !== "vorhaben"} className="space-y-4">
        {showPrioritaeten && backlogCanView ? (
          <InitiativeBacklogWorkspace
            initialInitiatives={backlogInitiatives}
            canManage={backlogCanManage}
            canView={backlogCanView}
            initialTargetId={backlogTargetId}
            filterTarget={filterTarget}
            showPrioritaetenActive
          />
        ) : (
          <VorhabenAufgabenWorkspace
            variant="vorhaben"
            initialSnapshot={snapshot}
            initialTargetId={initialTargetId}
            initialInitiativeId={initialInitiativeId}
            filterTarget={filterTarget}
            showPrioritaetenControl={backlogCanView}
            showPrioritaetenActive={showPrioritaeten && backlogCanView}
          />
        )}
      </div>
      <div hidden={activeView !== "aufgaben"} aria-hidden={activeView !== "aufgaben"}>
        <VorhabenAufgabenWorkspace
          variant="aufgaben"
          initialSnapshot={snapshot}
          initialTargetId={initialTargetId}
          initialInitiativeId={initialInitiativeId}
        />
      </div>
      <div hidden={activeView !== "umsetzungsphasen"} aria-hidden={activeView !== "umsetzungsphasen"} className="space-y-4">
        <UmsetzungsplanungWorkspace sprints={sprints} canManageSprints={canManageSprints} />
      </div>
    </>
  );
}