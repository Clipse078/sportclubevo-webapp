"use client";

import VereinsentwicklungConnectedWorkspaceNav from "./VereinsentwicklungConnectedWorkspaceNav";
import VereinsentwicklungWorkspaceToolbar from "./VereinsentwicklungWorkspaceToolbar";
import ClubDevelopmentOverview from "./ClubDevelopmentOverview";
import type { VereinsentwicklungLeadershipDashboard } from "@/lib/club-development/vereinsentwicklung-leadership-dashboard";
import { PERMISSIONS } from "@/lib/permissions/permissions";

type Props = {
  permissionKeys: string[];
  hasPlanningAccess: boolean;
  orgEinheitFilterLabel?: string | null;
  orgEinheitQuery: Record<string, string>;
  dashboard: VereinsentwicklungLeadershipDashboard;
};

export default function ClubDevelopmentOverviewPageClient(props: Props) {
  const { permissionKeys, hasPlanningAccess, orgEinheitFilterLabel, orgEinheitQuery, dashboard } =
    props;
  const canSeeMeetings =
    permissionKeys.includes(PERMISSIONS.MEETINGS_VIEW) ||
    permissionKeys.includes(PERMISSIONS.MEETINGS_MANAGE);

  return (
    <>
      <VereinsentwicklungConnectedWorkspaceNav
        permissionKeys={permissionKeys}
        hasPlanningAccess={hasPlanningAccess}
        activeView="uebersicht"
      />
      <VereinsentwicklungWorkspaceToolbar orgEinheitFilterLabel={orgEinheitFilterLabel} />
      <ClubDevelopmentOverview
        dashboard={dashboard}
        orgEinheitQuery={orgEinheitQuery}
        canSeeMeetings={canSeeMeetings}
      />
    </>
  );
}