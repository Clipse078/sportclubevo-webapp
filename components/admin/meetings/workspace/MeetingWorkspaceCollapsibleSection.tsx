"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useId, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { MeetingWorkspaceTabId } from "@/lib/nav/meeting-workspace-tab-config";
import { meetingWorkspaceSectionDomId } from "@/lib/nav/meeting-workspace-tab-config";
import { workspacePanelClass, workspaceSectionBodyClass } from "./meetingWorkspaceFieldClasses";
import { useMeetingWorkspaceSections } from "./MeetingWorkspaceSectionsContext";

type Props = {
  sectionId: MeetingWorkspaceTabId;
  title: string;
  children: ReactNode;
  lazy?: boolean;
};

export default function MeetingWorkspaceCollapsibleSection({
  sectionId,
  title,
  children,
  lazy = false,
}: Props) {
  const panelId = useId();
  const {
    expandedSections,
    requestToggleSection,
    registerSectionHeading,
    sectionScrollMarginPx,
    hasActivatedLazySection,
  } = useMeetingWorkspaceSections();

  const domId = meetingWorkspaceSectionDomId(sectionId);
  const expanded = expandedSections.has(sectionId);
  const shouldRenderBody = !lazy || hasActivatedLazySection(sectionId);

  const setHeadingRef = useCallback(
    (el: HTMLHeadingElement | null) => {
      registerSectionHeading(sectionId, el);
    },
    [registerSectionHeading, sectionId],
  );

  return (
    <section
      id={domId}
      className={cn(workspacePanelClass, "scroll-mt-[var(--meeting-workspace-scroll-margin)]")}
      style={
        {
          "--meeting-workspace-scroll-margin": `${sectionScrollMarginPx}px`,
        } as CSSProperties
      }
      data-testid={`meeting-workspace-section-${sectionId}`}
      data-expanded={expanded ? "true" : "false"}
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)]/60 px-4 py-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => requestToggleSection(sectionId)}
          data-testid={`meeting-workspace-section-toggle-${sectionId}`}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-[var(--muted)] transition-transform motion-reduce:transition-none",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
          <h2
            ref={setHeadingRef}
            id={`${domId}-heading`}
            className="text-sm font-semibold text-[var(--foreground)]"
            tabIndex={-1}
          >
            {title}
          </h2>
        </button>
      </div>
      {shouldRenderBody ? (
        <div
          id={panelId}
          hidden={!expanded}
          className={workspaceSectionBodyClass}
          data-testid={`meeting-workspace-panel-${sectionId}`}
          aria-labelledby={`${domId}-heading`}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}