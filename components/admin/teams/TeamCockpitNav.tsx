"use client";

import SceContextTabs from "@/components/sce/context-tabs/SceContextTabs";
import { SceContextTabProvider } from "@/lib/context-tabs/use-context-detail-tab";
import {
  buildTeamBasePath,
  buildTeamCockpitTabNavigationConfig,
  isTabActive,
  type TeamCockpitTabId,
} from "@/lib/teams/team-cockpit-tab-config";

type Props = {
  teamId: string;
  canManage: boolean;
  canDelete: boolean;
};

/**
 * Team Cockpit secondary navigation — Finance-aligned `SceContextTabs` on route segments.
 */
export default function TeamCockpitNav({ teamId, canManage, canDelete }: Props) {
  const showAdministration = canManage || canDelete;
  const config = buildTeamCockpitTabNavigationConfig({
    teamId,
    showAdministration,
  });

  return (
    <SceContextTabProvider config={config}>
      <SceContextTabs<TeamCockpitTabId>
        config={config}
        ariaLabel="Team Cockpit"
        testId="team-cockpit-nav"
        idPrefix="team-cockpit-tab"
      />
    </SceContextTabProvider>
  );
}

export { buildTeamBasePath, isTabActive };
