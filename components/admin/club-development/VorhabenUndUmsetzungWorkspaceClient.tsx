"use client";

import { useSearchParams } from "next/navigation";
import type { VorhabenWorkspaceSnapshot } from "@/lib/club-development/vorhaben-workspace";
import InitiativeBacklogWorkspace from "./InitiativeBacklogWorkspace";
import VorhabenAufgabenWorkspace from "./VorhabenAufgabenWorkspace";
import DevelopmentSprintCreateCard from "./DevelopmentSprintCreateCard";
import DevelopmentSprintList, {
  type DevelopmentSprintListItem,
} from "./DevelopmentSprintList";
import VereinsentwicklungWorkspaceViewNav from "./VereinsentwicklungWorkspaceViewNav";
import VorhabenPrioritaetenControl from "./VorhabenPrioritaetenControl";
import SceClubDevelopmentSectionShell from "./SceClubDevelopmentSectionShell";
import {
  buildVorhabenUndUmsetzungHref,
  CD_VORHABEN_UMSETZUNG_VIEWS,
  CD_VORHABEN_UMSETZUNG_VIEW_LABELS,
  CD_WORKSPACE_PRIORITAETEN_QUERY,
  parseVorhabenUmsetzungView,
} from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import { CD_NAV_COPY } from "@/lib/club-development/product-copy";

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
  sprints: DevelopmentSprintListItem[];
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
        <VorhabenPrioritaetenControl prioritaetenActive={showPrioritaeten && backlogCanView} />
        {showPrioritaeten && backlogCanView ? (
          <InitiativeBacklogWorkspace
            initialInitiatives={backlogInitiatives}
            canManage={backlogCanManage}
            canView={backlogCanView}
            initialTargetId={backlogTargetId}
          />
        ) : (
          <VorhabenAufgabenWorkspace
            variant="vorhaben"
            initialSnapshot={snapshot}
            initialTargetId={initialTargetId}
            initialInitiativeId={initialInitiativeId}
            filterTarget={filterTarget}
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
        <SceClubDevelopmentSectionShell title={CD_NAV_COPY.implementationPlanning} bodyClassName="p-5 space-y-4">
          <DevelopmentSprintCreateCard canCreate={canManageSprints} />
          <DevelopmentSprintList sprints={sprints} />
        </SceClubDevelopmentSectionShell>
      </div>
    </>
  );
}