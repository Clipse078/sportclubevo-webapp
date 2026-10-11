"use client";

import type { ReactNode } from "react";
import ActivityDetailNavigationBoundary from "@/components/admin/activity-navigation/ActivityDetailNavigationBoundary";
import { ActivityDirtyNavigationProvider } from "@/lib/activity-navigation/ActivityDirtyNavigationContext";
import { buildActivityTabNavigationConfig } from "@/lib/activity-navigation/configs";
import ActivityTabPanel from "@/lib/activity-navigation/ActivityTabPanel";
import { useActivityDetailTab } from "@/lib/activity-navigation/use-activity-detail-tab";
import { useActivityDirtyNavigation } from "@/lib/activity-navigation/ActivityDirtyNavigationContext";
import { useEffect } from "react";

type Props = {
  isDirty: boolean;
  participationAvailable?: boolean;
  uebersicht: ReactNode;
  teilnahme: ReactNode;
  planung: ReactNode;
  kommunikation: ReactNode;
  mehr: ReactNode;
};

function TurniereTabPanels({
  isDirty,
  uebersicht,
  teilnahme,
  planung,
  kommunikation,
  mehr,
}: Props) {
  const { activeTab } = useActivityDetailTab();
  const dirtyNav = useActivityDirtyNavigation();

  useEffect(() => {
    dirtyNav.setDirty(isDirty);
    return () => dirtyNav.setDirty(false);
  }, [dirtyNav, isDirty]);

  return (
    <div className="space-y-4" data-testid="tournament-activity-tab-panels">
      <ActivityTabPanel tabKey="uebersicht" activeTab={activeTab}>
        {uebersicht}
      </ActivityTabPanel>
      <ActivityTabPanel tabKey="teilnahme" activeTab={activeTab}>
        {teilnahme}
      </ActivityTabPanel>
      <ActivityTabPanel tabKey="planung" activeTab={activeTab}>
        {planung}
      </ActivityTabPanel>
      <ActivityTabPanel tabKey="kommunikation" activeTab={activeTab}>
        {kommunikation}
      </ActivityTabPanel>
      <ActivityTabPanel tabKey="mehr" activeTab={activeTab}>
        {mehr}
      </ActivityTabPanel>
    </div>
  );
}

export default function TurniereTournamentActivityTabShell({
  isDirty,
  participationAvailable,
  ...panels
}: Props) {
  const config = buildActivityTabNavigationConfig({
    kind: "TOURNAMENT",
    participationAvailable,
  });

  return (
    <ActivityDirtyNavigationProvider>
      <ActivityDetailNavigationBoundary
        config={config}
        ariaLabel="Turnier"
        testId="tournament-activity-nav"
      >
        <TurniereTabPanels isDirty={isDirty} {...panels} />
      </ActivityDetailNavigationBoundary>
    </ActivityDirtyNavigationProvider>
  );
}
