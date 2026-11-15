import type { MeetingWorkspaceTabId } from "@/lib/nav/meeting-workspace-tab-config";
import {
  measureMeetingWorkspaceScrollOffset,
  scrollMeetingWorkspaceSectionHeading,
} from "@/lib/meetings/meeting-workspace-scroll";

export const MEETING_WORKSPACE_SPY_SUPPRESS_MS = 900;

export type ProgrammaticSectionScrollLock = {
  sectionId: MeetingWorkspaceTabId;
  until: number;
};

/** Wait for expand/unhide to commit before measuring layout. */
export function afterExpandedLayoutCommit(callback: () => void): void {
  if (typeof window === "undefined") {
    callback();
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

export function computeSectionScrollTop(
  heading: HTMLElement,
  navEl: HTMLElement | null,
): number {
  const offset = measureMeetingWorkspaceScrollOffset(navEl);
  const ideal = heading.getBoundingClientRect().top + window.scrollY - offset;
  const maxScroll = Math.max(
    0,
    (document.documentElement?.scrollHeight ?? 0) - window.innerHeight,
  );
  return Math.min(Math.max(0, ideal), maxScroll);
}

export function createProgrammaticScrollLock(
  sectionId: MeetingWorkspaceTabId,
  durationMs = MEETING_WORKSPACE_SPY_SUPPRESS_MS,
): ProgrammaticSectionScrollLock {
  return { sectionId, until: Date.now() + durationMs };
}

export function shouldSuppressScrollSpy(
  lock: ProgrammaticSectionScrollLock | null,
  now = Date.now(),
): lock is ProgrammaticSectionScrollLock {
  return lock !== null && now < lock.until;
}

export function scrollMeetingWorkspaceSectionHeadingAfterLayout(
  heading: HTMLElement,
  navEl: HTMLElement | null,
): void {
  scrollMeetingWorkspaceSectionHeading(heading, navEl);
}