"use client";

import { useCallback, useEffect, useMemo, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  SCE_CONTEXT_TABS_NAV_CLASS,
  sceContextTabClassName,
} from "@/lib/design-system/sce-context-tabs-foundation";
import { SceContextTabProvider, useContextDetailTab } from "@/lib/context-tabs/use-context-detail-tab";
import {
  buildMeetingWorkspaceTabNavigationConfig,
  meetingWorkspaceSectionDomId,
  type MeetingWorkspaceTabId,
} from "@/lib/nav/meeting-workspace-tab-config";

type Counts = {
  traktanden: number;
  beschluesse: number;
  pendenzenOpen: number;
  teilnehmer: number;
};

type Props = {
  counts: Counts;
  children: (activeTab: MeetingWorkspaceTabId) => ReactNode;
};

const LEGACY_SECTION_TO_TAB: Record<string, MeetingWorkspaceTabId> = {
  "meeting-section-traktanden": "traktanden",
  "meeting-section-beschlüsse": "beschluesse",
  "meeting-section-teilnehmer": "teilnehmer",
  "meeting-section-pendenzen": "pendenzen",
  "meeting-section-massnahmen": "pendenzen",
  "meeting-section-aufgaben": "pendenzen",
};

function MeetingWorkspaceSectionNavInner({
  counts,
  children,
}: Props) {
  const { activeTab, navigateToTab, config } = useContextDetailTab<MeetingWorkspaceTabId>();

  useEffect(() => {
    function onNavigateTab(event: Event) {
      const detail = (event as CustomEvent<{ tab?: MeetingWorkspaceTabId }>).detail;
      if (detail?.tab) {
        navigateToTab(detail.tab, { skipDirtyConfirm: true });
      }
    }
    function onHashSection() {
      const hash = window.location.hash.replace(/^#/, "");
      const tab = LEGACY_SECTION_TO_TAB[hash];
      if (tab) {
        navigateToTab(tab, { skipDirtyConfirm: true });
      }
    }
    window.addEventListener("meeting-workspace-navigate-tab", onNavigateTab);
    window.addEventListener("hashchange", onHashSection);
    onHashSection();
    return () => {
      window.removeEventListener("meeting-workspace-navigate-tab", onNavigateTab);
      window.removeEventListener("hashchange", onHashSection);
    };
  }, [navigateToTab]);

  const activate = useCallback(
    (tab: MeetingWorkspaceTabId) => {
      navigateToTab(tab);
    },
    [navigateToTab],
  );

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const tabs = config.tabs;
    const index = tabs.findIndex((t) => t.key === activeTab);
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = tabs[(index + 1) % tabs.length];
      if (next) activate(next.key);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prev = tabs[(index - 1 + tabs.length) % tabs.length];
      if (prev) activate(prev.key);
    }
  }

  return (
    <section className={cn("min-w-0")}>
      <h2 className="sr-only">Sitzungsbereiche</h2>
      <div
        data-testid="meeting-workspace-section-nav"
        role="tablist"
        aria-label="Sitzungsbereiche"
        className={SCE_CONTEXT_TABS_NAV_CLASS}
        onKeyDown={onKeyDown}
      >
        {config.tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const label = tab.label;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`meeting-workspace-tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={meetingWorkspaceSectionDomId(tab.key)}
              tabIndex={isActive ? 0 : -1}
              className={sceContextTabClassName(isActive)}
              onClick={() => activate(tab.key)}
              data-testid={`meeting-workspace-tab-${tab.key}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={meetingWorkspaceSectionDomId(activeTab)}
        aria-labelledby={`meeting-workspace-tab-${activeTab}`}
        className="mt-4 focus:outline-none"
        data-testid={`meeting-workspace-panel-${activeTab}`}
      >
        {children(activeTab)}
      </div>
    </section>
  );
}

export default function MeetingWorkspaceSectionNav(props: Props) {
  const config = useMemo(
    () => buildMeetingWorkspaceTabNavigationConfig(props.counts),
    [props.counts],
  );

  return (
    <SceContextTabProvider config={config}>
      <MeetingWorkspaceSectionNavInner {...props} />
    </SceContextTabProvider>
  );
}
