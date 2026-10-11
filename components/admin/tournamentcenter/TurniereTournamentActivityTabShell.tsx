"use client";

import type { ReactNode } from "react";
import SceContextTabsBoundary from "@/components/sce/context-tabs/SceContextTabsBoundary";
import { SceContextDirtyGuardProvider } from "@/lib/context-tabs";
import { buildActivityTabNavigationConfig } from "@/lib/activity-navigation/configs";
import ActivityTabPanel from "@/lib/activity-navigation/ActivityTabPanel";
import { useActivityDetailTab } from "@/lib/activity-navigation/use-activity-detail-tab";
import { useActivityDirtyNavigation } from "@/lib/activity-navigation/ActivityDirtyNavigationContext";
import { useEffect } from "react";

type Props = {
  isDirty: boolean;
  participationAvailable?: boolean;
  tournamentSquadAvailable?: boolean;
  uebersicht: ReactNode;
  aufgebot?: ReactNode;
  teilnahme: ReactNode;
  planung: ReactNode;
  kommunikation: ReactNode;
  mehr: ReactNode;
};

function TurniereTabPanels({
  isDirty,
  uebersicht,
  aufgebot,
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
      {aufgebot ? (
        <ActivityTabPanel tabKey="aufgebot" activeTab={activeTab}>
          {aufgebot}
        </ActivityTabPanel>
      ) : null}
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
  tournamentSquadAvailable,
  ...panels
}: Props) {
  const config = buildActivityTabNavigationConfig({
    kind: "TOURNAMENT",
    participationAvailable,
    tournamentSquadAvailable,
  });

  return (
    <SceContextDirtyGuardProvider>
      <SceContextTabsBoundary
        config={config}
        ariaLabel="Turnier"
        testId="tournament-activity-nav"
        idPrefix="activity-tab"
      >
        <TurniereTabPanels isDirty={isDirty} {...panels} />
      </SceContextTabsBoundary>
    </SceContextDirtyGuardProvider>
  );
}
