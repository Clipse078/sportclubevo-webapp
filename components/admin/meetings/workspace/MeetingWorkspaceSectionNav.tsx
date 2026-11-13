"use client";

import { useCallback, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  SCE_CONTEXT_TABS_NAV_CLASS,
  sceContextTabClassName,
} from "@/lib/design-system/sce-context-tabs-foundation";
import {
  buildMeetingWorkspaceTabNavigationConfig,
  meetingWorkspaceSectionDomId,
  type MeetingWorkspaceTabId,
} from "@/lib/nav/meeting-workspace-tab-config";

type Props = {
  counts: {
    traktanden: number;
    beschluesse: number;
    pendenzenOpen: number;
    teilnehmer: number;
  };
  activeTab: MeetingWorkspaceTabId;
  onTabChange: (tab: MeetingWorkspaceTabId) => void;
  children: ReactNode;
};

export default function MeetingWorkspaceSectionNav({
  counts,
  activeTab,
  onTabChange,
  children,
}: Props) {
  const config = buildMeetingWorkspaceTabNavigationConfig(counts);

  const activate = useCallback(
    (tab: MeetingWorkspaceTabId) => {
      onTabChange(tab);
    },
    [onTabChange],
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
        {children}
      </div>
    </section>
  );
}
