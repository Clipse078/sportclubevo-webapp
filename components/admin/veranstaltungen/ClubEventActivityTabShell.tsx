"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import SceContextTabsBoundary from "@/components/sce/context-tabs/SceContextTabsBoundary";
import { SceContextDirtyGuardProvider, useContextDirtyNavigation } from "@/lib/context-tabs";
import { buildActivityTabNavigationConfig } from "@/lib/activity-navigation/configs";
import ActivityTabPanel from "@/lib/activity-navigation/ActivityTabPanel";
import { useActivityDetailTab } from "@/lib/activity-navigation/use-activity-detail-tab";

type Props = {
  isDirty?: boolean;
  uebersicht: ReactNode;
  teilnahme: ReactNode;
  planung: ReactNode;
  kommunikation: ReactNode;
  mehr: ReactNode;
};

function ClubEventTabPanels({ isDirty = false, ...panels }: Props) {
  const { activeTab } = useActivityDetailTab();
  const dirtyNav = useContextDirtyNavigation();

  useEffect(() => {
    dirtyNav.setDirty(isDirty);
    return () => dirtyNav.setDirty(false);
  }, [dirtyNav, isDirty]);

  return (
    <div className="space-y-4" data-testid="club-event-activity-tab-panels">
      <ActivityTabPanel tabKey="uebersicht" activeTab={activeTab}>
        {panels.uebersicht}
      </ActivityTabPanel>
      <ActivityTabPanel tabKey="teilnahme" activeTab={activeTab}>
        {panels.teilnahme}
      </ActivityTabPanel>
      <ActivityTabPanel tabKey="planung" activeTab={activeTab}>
        {panels.planung}
      </ActivityTabPanel>
      <ActivityTabPanel tabKey="kommunikation" activeTab={activeTab}>
        {panels.kommunikation}
      </ActivityTabPanel>
      <ActivityTabPanel tabKey="mehr" activeTab={activeTab}>
        {panels.mehr}
      </ActivityTabPanel>
    </div>
  );
}

export default function ClubEventActivityTabShell(props: Props) {
  const config = buildActivityTabNavigationConfig({ kind: "CLUB_EVENT" });

  return (
    <SceContextDirtyGuardProvider>
      <SceContextTabsBoundary
        config={config}
        ariaLabel="Veranstaltung"
        testId="veranstaltung-activity-nav"
        idPrefix="activity-tab"
      >
        <ClubEventTabPanels {...props} />
      </SceContextTabsBoundary>
    </SceContextDirtyGuardProvider>
  );
}
