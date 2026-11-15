"use client";

import { useMemo, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  SCE_CONTEXT_TABS_NAV_CLASS,
  sceContextTabClassName,
} from "@/lib/design-system/sce-context-tabs-foundation";
import {
  buildMeetingWorkspaceTabNavigationConfig,
  type MeetingWorkspaceTabId,
} from "@/lib/nav/meeting-workspace-tab-config";
import {
  MeetingWorkspaceSectionsProvider,
  useMeetingWorkspaceSections,
} from "./MeetingWorkspaceSectionsContext";

type Counts = {
  traktanden: number;
  beschluesse: number;
  pendenzenOpen: number;
  teilnehmer: number;
};

type InnerProps = {
  children: ReactNode;
};

function MeetingWorkspaceSectionNavLinks() {
  const { highlightedSection, navigateToSection, hrefForSection, registerSectionNav, counts } =
    useMeetingWorkspaceSections();

  const config = useMemo(() => buildMeetingWorkspaceTabNavigationConfig(counts), [counts]);

  function onNavClick(event: MouseEvent<HTMLAnchorElement>, tab: MeetingWorkspaceTabId) {
    event.preventDefault();
    navigateToSection(tab);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const tabs = config.tabs;
    const index = tabs.findIndex((t) => t.key === highlightedSection);
    const focusLink = (tab: MeetingWorkspaceTabId) => {
      document.getElementById(`meeting-workspace-nav-${tab}`)?.focus();
    };
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = tabs[(index + 1) % tabs.length];
      if (next) {
        navigateToSection(next.key);
        focusLink(next.key);
      }
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prev = tabs[(index - 1 + tabs.length) % tabs.length];
      if (prev) {
        navigateToSection(prev.key);
        focusLink(prev.key);
      }
    }
  }

  return (
    <nav
      ref={(el) => registerSectionNav(el)}
      aria-label="Sitzungsbereiche"
      data-testid="meeting-workspace-section-nav"
      className={cn(
        SCE_CONTEXT_TABS_NAV_CLASS,
        "sticky z-20 -mx-1 bg-[var(--background)]/95 px-1 pb-0 pt-1 backdrop-blur-sm",
      )}
      style={{ top: "var(--sce-global-app-header-offset, 0px)" }}
      onKeyDown={onKeyDown}
    >
      {config.tabs.map((tab) => {
        const isCurrent = tab.key === highlightedSection;
        return (
          <Link
            key={tab.key}
            id={`meeting-workspace-nav-${tab.key}`}
            href={hrefForSection(tab.key)}
            aria-current={isCurrent ? "location" : undefined}
            className={cn(sceContextTabClassName(isCurrent), "no-underline")}
            onClick={(event) => onNavClick(event, tab.key)}
            data-testid={`meeting-workspace-tab-${tab.key}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MeetingWorkspaceSectionNavInner({ children }: InnerProps) {
  return (
    <section className="min-w-0 space-y-4">
      <h2 className="sr-only">Sitzungsbereiche</h2>
      <MeetingWorkspaceSectionNavLinks />
      <div className="space-y-4">{children}</div>
    </section>
  );
}

type Props = InnerProps & {
  counts: Counts;
};

export default function MeetingWorkspaceSectionNav({ counts, children }: Props) {
  return (
    <MeetingWorkspaceSectionsProvider counts={counts}>
      <MeetingWorkspaceSectionNavInner>{children}</MeetingWorkspaceSectionNavInner>
    </MeetingWorkspaceSectionsProvider>
  );
}