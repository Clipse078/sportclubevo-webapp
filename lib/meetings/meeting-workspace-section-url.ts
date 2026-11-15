import type { MeetingWorkspaceTabId } from "@/lib/nav/meeting-workspace-tab-config";
import {
  meetingWorkspaceSectionDomId,
  MEETING_WORKSPACE_SECTION_ORDER,
} from "@/lib/nav/meeting-workspace-tab-config";

export const MEETING_WORKSPACE_LEGACY_BEREICH_PARAM = "bereich";

/** Historic in-page section ids from lifecycle hints and embedded panels. */
export const LEGACY_MEETING_SECTION_HASH_TO_TAB: Record<string, MeetingWorkspaceTabId> = {
  "meeting-section-traktanden": "traktanden",
  "meeting-section-beschlüsse": "beschluesse",
  "meeting-section-teilnehmer": "teilnehmer",
  "meeting-section-pendenzen": "pendenzen",
  "meeting-section-massnahmen": "pendenzen",
  "meeting-section-aufgaben": "pendenzen",
};

const TAB_SET = new Set<string>(MEETING_WORKSPACE_SECTION_ORDER);

export function isMeetingWorkspaceTabId(value: string): value is MeetingWorkspaceTabId {
  return TAB_SET.has(value);
}

export function meetingWorkspaceHashForTab(tab: MeetingWorkspaceTabId): string {
  return meetingWorkspaceSectionDomId(tab);
}

export function resolveMeetingWorkspaceTabFromHash(rawHash: string): MeetingWorkspaceTabId | null {
  const hash = rawHash.replace(/^#/, "").trim();
  if (!hash) return null;

  if (isMeetingWorkspaceTabId(hash)) {
    return hash;
  }

  const workspacePrefix = "meeting-workspace-section-";
  if (hash.startsWith(workspacePrefix)) {
    const tabId = hash.slice(workspacePrefix.length);
    if (isMeetingWorkspaceTabId(tabId)) {
      return tabId;
    }
  }

  const legacy = LEGACY_MEETING_SECTION_HASH_TO_TAB[hash];
  return legacy ?? null;
}

export function resolveMeetingWorkspaceTabFromBereichParam(
  raw: string | null | undefined,
): MeetingWorkspaceTabId | null {
  if (!raw || !isMeetingWorkspaceTabId(raw)) {
    return null;
  }
  return raw;
}

export function buildMeetingWorkspaceLocationHref(input: {
  pathname: string;
  searchParams: URLSearchParams;
  tab: MeetingWorkspaceTabId;
}): string {
  const params = new URLSearchParams();
  input.searchParams.forEach((value, key) => {
    if (key === MEETING_WORKSPACE_LEGACY_BEREICH_PARAM) {
      return;
    }
    params.set(key, value);
  });
  const search = params.toString();
  const hash = meetingWorkspaceHashForTab(input.tab);
  return `${input.pathname}${search ? `?${search}` : ""}#${hash}`;
}

export function stripLegacyBereichFromSearchParams(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== MEETING_WORKSPACE_LEGACY_BEREICH_PARAM) {
      next.set(key, value);
    }
  });
  return next;
}