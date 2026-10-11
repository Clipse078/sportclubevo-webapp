"use client";

import type { ReactNode } from "react";
import ActivityDetailNavigationBoundary from "@/components/admin/activity-navigation/ActivityDetailNavigationBoundary";
import { ActivityDirtyNavigationProvider } from "@/lib/activity-navigation/ActivityDirtyNavigationContext";
import { buildActivityTabNavigationConfig } from "@/lib/activity-navigation/configs";
import ActivityTabPanel from "@/lib/activity-navigation/ActivityTabPanel";
import { useActivityDetailTab } from "@/lib/activity-navigation/use-activity-detail-tab";

type Props = {
  uebersicht: ReactNode;
  teilnahme: ReactNode;
  planung: ReactNode;
  kommunikation: ReactNode;
  mehr: ReactNode;
};

function TrainingSessionTabPanels({
  uebersicht,
  teilnahme,
  planung,
  kommunikation,
  mehr,
}: Props) {
  const { activeTab } = useActivityDetailTab();

  return (
    <div className="space-y-4" data-testid="training-activity-tab-panels">
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

export default function TrainingSessionActivityTabShell(props: Props) {
  const config = buildActivityTabNavigationConfig({ kind: "TRAINING" });

  return (
    <ActivityDirtyNavigationProvider>
      <ActivityDetailNavigationBoundary
        config={config}
        ariaLabel="Training"
        testId="training-activity-nav"
      >
        <TrainingSessionTabPanels {...props} />
      </ActivityDetailNavigationBoundary>
    </ActivityDirtyNavigationProvider>
  );
}
