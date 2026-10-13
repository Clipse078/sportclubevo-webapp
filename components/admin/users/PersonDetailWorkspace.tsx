"use client";

import type { ReactNode } from "react";
import SceContextTabsBoundary from "@/components/sce/context-tabs/SceContextTabsBoundary";
import {
  SceContextDirtyGuardProvider,
  SceContextTabPanel,
  useContextDetailTab,
} from "@/lib/context-tabs";
import type { PersonDetailTabId } from "@/lib/admin/users/person-detail-workspace-config";
import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

const TAB_ID_PREFIX = "person-detail-tab";

type PanelProps = {
  uebersicht: ReactNode;
  rollenFunktionen: ReactNode;
  bereiche: ReactNode;
  veranstaltungsFreigaben: ReactNode | null;
  zugriff: ReactNode;
};

function PersonDetailTabPanels({
  uebersicht,
  rollenFunktionen,
  bereiche,
  veranstaltungsFreigaben,
  zugriff,
}: PanelProps) {
  const { activeTab } = useContextDetailTab();

  return (
    <div className="space-y-4 pt-4" data-testid="person-detail-tab-panels">
      <SceContextTabPanel
        tabKey="uebersicht"
        activeTab={activeTab}
        idPrefix={TAB_ID_PREFIX}
        testId="person-detail-panel-uebersicht"
      >
        {uebersicht}
      </SceContextTabPanel>
      <SceContextTabPanel
        tabKey="rollen-funktionen"
        activeTab={activeTab}
        idPrefix={TAB_ID_PREFIX}
        testId="person-detail-panel-rollen-funktionen"
      >
        {rollenFunktionen}
      </SceContextTabPanel>
      <SceContextTabPanel
        tabKey="bereiche"
        activeTab={activeTab}
        idPrefix={TAB_ID_PREFIX}
        testId="person-detail-panel-bereiche"
      >
        {bereiche}
      </SceContextTabPanel>
      {veranstaltungsFreigaben ? (
        <SceContextTabPanel
          tabKey="veranstaltungs-freigaben"
          activeTab={activeTab}
          idPrefix={TAB_ID_PREFIX}
          testId="person-detail-panel-veranstaltungs-freigaben"
        >
          {veranstaltungsFreigaben}
        </SceContextTabPanel>
      ) : null}
      <SceContextTabPanel
        tabKey="zugriff"
        activeTab={activeTab}
        idPrefix={TAB_ID_PREFIX}
        testId="person-detail-panel-zugriff"
      >
        {zugriff}
      </SceContextTabPanel>
    </div>
  );
}

type Props = PanelProps & {
  config: ContextTabNavigationConfig<PersonDetailTabId>;
};

export default function PersonDetailWorkspace({
  config,
  uebersicht,
  rollenFunktionen,
  bereiche,
  veranstaltungsFreigaben,
  zugriff,
}: Props) {
  return (
    <SceContextDirtyGuardProvider>
      <SceContextTabsBoundary
        config={config}
        ariaLabel="Person"
        testId="person-detail-nav"
        idPrefix={TAB_ID_PREFIX}
      >
        <PersonDetailTabPanels
          uebersicht={uebersicht}
          rollenFunktionen={rollenFunktionen}
          bereiche={bereiche}
          veranstaltungsFreigaben={veranstaltungsFreigaben}
          zugriff={zugriff}
        />
      </SceContextTabsBoundary>
    </SceContextDirtyGuardProvider>
  );
}
