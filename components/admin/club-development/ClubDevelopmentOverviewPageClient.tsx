"use client";

import VereinsentwicklungConnectedWorkspaceNav from "./VereinsentwicklungConnectedWorkspaceNav";
import VereinsentwicklungWorkspaceToolbar from "./VereinsentwicklungWorkspaceToolbar";
import ClubDevelopmentOverview from "./ClubDevelopmentOverview";
import type { VereinsentwicklungLeadershipDashboard } from "@/lib/club-development/vereinsentwicklung-leadership-dashboard";
import type { VereinsentwicklungOverviewPreview } from "@/lib/club-development/vereinsentwicklung-overview-preview";
import { PERMISSIONS } from "@/lib/permissions/permissions";

type Props = {
  permissionKeys: string[];
  hasPlanningAccess: boolean;
  orgEinheitFilterLabel?: string | null;
  orgEinheitQuery: Record<string, string>;
  dashboard: VereinsentwicklungLeadershipDashboard;
  overviewPreview: VereinsentwicklungOverviewPreview;
};

export default function ClubDevelopmentOverviewPageClient(props: Props) {
  const { permissionKeys, hasPlanningAccess, orgEinheitFilterLabel, orgEinheitQuery, dashboard, overviewPreview } =
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
        overviewPreview={overviewPreview}
        orgEinheitQuery={orgEinheitQuery}
        canSeeMeetings={canSeeMeetings}
      />
    </>
  );
}