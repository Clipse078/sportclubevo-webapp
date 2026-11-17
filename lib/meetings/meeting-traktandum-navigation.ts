import { meetingWorkspaceHashForTab } from "@/lib/meetings/meeting-workspace-section-url";

export const MEETING_TRAKTANDUM_QUERY_PARAM = "traktandum";

export function buildMeetingTraktandumDeepLink(slug: string, agendaItemId: string): string {
  const params = new URLSearchParams({ [MEETING_TRAKTANDUM_QUERY_PARAM]: agendaItemId.trim() });
  const hash = meetingWorkspaceHashForTab("traktanden");
  return `/vereinsleitung/meetings/${encodeURIComponent(slug)}?${params.toString()}#${hash}`;
}

export const MEETING_FOCUS_DECISION_QUERY = "focusDecision";
export const MEETING_FOCUS_ACTION_QUERY = "focusAction";

export function buildMeetingDecisionDeepLink(slug: string, decisionId: string): string {
  const params = new URLSearchParams({ [MEETING_FOCUS_DECISION_QUERY]: decisionId.trim() });
  const hash = meetingWorkspaceHashForTab("beschluesse");
  return `/vereinsleitung/meetings/${encodeURIComponent(slug)}?${params.toString()}#${hash}`;
}

export function buildMeetingPendenzDeepLink(slug: string, actionId: string): string {
  const params = new URLSearchParams({ [MEETING_FOCUS_ACTION_QUERY]: actionId.trim() });
  const hash = meetingWorkspaceHashForTab("pendenzen");
  return `/vereinsleitung/meetings/${encodeURIComponent(slug)}?${params.toString()}#${hash}`;
}