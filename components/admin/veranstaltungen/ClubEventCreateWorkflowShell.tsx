"use client";

/** @deprecated Use SceActivityComposer tab navigation — retained for legacy tests only. */
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import SceContextTabsBoundary from "@/components/sce/context-tabs/SceContextTabsBoundary";
import { SceContextDirtyGuardProvider, useContextDirtyNavigation } from "@/lib/context-tabs";
import SceContextTabPanel from "@/lib/context-tabs/ContextTabPanel";
import { useContextDetailTab } from "@/lib/context-tabs/use-context-detail-tab";
import {
  buildClubEventCreateTabNavigationConfig,
  type ClubEventCreateTabId,
} from "@/lib/veranstaltungen/club-event-create-workflow-config";

type PanelProps = Record<ClubEventCreateTabId, ReactNode> & {
  isDirty?: boolean;
  tabErrors?: Partial<Record<ClubEventCreateTabId, boolean>>;
};

function ClubEventCreateTabPanels({
  isDirty = false,
  tabErrors,
  ...panels
}: PanelProps) {
  const config = useMemo(
    () => buildClubEventCreateTabNavigationConfig({ tabErrors }),
    [tabErrors],
  );
  const { activeTab } = useContextDetailTab(config);
  const dirtyNav = useContextDirtyNavigation();

  useEffect(() => {
    dirtyNav.setDirty(isDirty);
    return () => dirtyNav.setDirty(false);
  }, [dirtyNav, isDirty]);

  return (
    <div className="space-y-4" data-testid="club-event-create-tab-panels">
      {(Object.keys(panels) as ClubEventCreateTabId[]).map((tabKey) => (
        <SceContextTabPanel
          key={tabKey}
          tabKey={tabKey}
          activeTab={activeTab}
          idPrefix="club-event-create-tab"
          testId={`club-event-create-panel-${tabKey}`}
        >
          {panels[tabKey]}
        </SceContextTabPanel>
      ))}
    </div>
  );
}

type ShellProps = PanelProps;

export default function ClubEventCreateWorkflowShell(props: ShellProps) {
  const config = useMemo(
    () => buildClubEventCreateTabNavigationConfig({ tabErrors: props.tabErrors }),
    [props.tabErrors],
  );

  return (
    <SceContextDirtyGuardProvider>
      <SceContextTabsBoundary
        config={config}
        ariaLabel="Veranstaltung erstellen"
        testId="club-event-create-nav"
        idPrefix="club-event-create-tab"
      >
        <ClubEventCreateTabPanels {...props} />
      </SceContextTabsBoundary>
    </SceContextDirtyGuardProvider>
  );
}
