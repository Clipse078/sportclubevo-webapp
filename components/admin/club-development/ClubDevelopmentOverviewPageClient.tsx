"use client";

import VereinsentwicklungConnectedWorkspaceNav from "./VereinsentwicklungConnectedWorkspaceNav";
import VereinsentwicklungWorkspaceToolbar from "./VereinsentwicklungWorkspaceToolbar";
import ClubDevelopmentOverview, {
  type ClubDevelopmentOverviewKpis,
} from "./ClubDevelopmentOverview";
import type { GovernanceOverviewData } from "@/lib/dashboard/governance-overview";

type Props = {
  permissionKeys: string[];
  hasPlanningAccess: boolean;
  orgEinheitFilterLabel?: string | null;
  targets: React.ComponentProps<typeof ClubDevelopmentOverview>["targets"];
  initiatives: React.ComponentProps<typeof ClubDevelopmentOverview>["initiatives"];
  upcomingMeetings: React.ComponentProps<typeof ClubDevelopmentOverview>["upcomingMeetings"];
  assignedTasks: React.ComponentProps<typeof ClubDevelopmentOverview>["assignedTasks"];
  governance: GovernanceOverviewData;
  kpis: ClubDevelopmentOverviewKpis;
};

export default function ClubDevelopmentOverviewPageClient(props: Props) {
  const { permissionKeys, hasPlanningAccess, orgEinheitFilterLabel, ...overviewProps } = props;
  return (
    <>
      <VereinsentwicklungConnectedWorkspaceNav
        permissionKeys={permissionKeys}
        hasPlanningAccess={hasPlanningAccess}
        activeView="uebersicht"
      />
      <VereinsentwicklungWorkspaceToolbar orgEinheitFilterLabel={orgEinheitFilterLabel} />
      <ClubDevelopmentOverview {...overviewProps} />
    </>
  );
}