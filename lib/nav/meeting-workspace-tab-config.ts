import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type MeetingWorkspaceTabId =
  | "traktanden"
  | "beschluesse"
  | "massnahmen"
  | "teilnehmer"
  | "details";

const TAB_LABELS: Record<MeetingWorkspaceTabId, string> = {
  traktanden: "Traktanden",
  beschluesse: "Beschlüsse",
  massnahmen: "Massnahmen",
  teilnehmer: "Teilnehmer",
  details: "Sitzungsdetails",
};

function tabLabelWithCount(base: string, count: number | undefined): string {
  if (count === undefined) return base;
  return `${base} (${count})`;
}

export function formatMeetingWorkspaceTabLabel(
  tabId: MeetingWorkspaceTabId,
  counts: {
    traktanden: number;
    beschluesse: number;
    massnahmen: number;
    aufgaben: number;
    teilnehmer: number;
  },
): string {
  if (tabId === "details") return TAB_LABELS.details;
  if (tabId === "massnahmen") {
    return `${TAB_LABELS.massnahmen} (${counts.massnahmen}) · Aufgaben (${counts.aufgaben})`;
  }
  const key = tabId as keyof typeof counts;
  if (key === "aufgaben") return TAB_LABELS.massnahmen;
  return tabLabelWithCount(TAB_LABELS[tabId], counts[key]);
}

export function buildMeetingWorkspaceTabNavigationConfig(counts: {
  traktanden: number;
  beschluesse: number;
  massnahmen: number;
  aufgaben: number;
  teilnehmer: number;
}): ContextTabNavigationConfig<MeetingWorkspaceTabId> {
  const tabIds: MeetingWorkspaceTabId[] = [
    "traktanden",
    "beschluesse",
    "massnahmen",
    "teilnehmer",
    "details",
  ];

  return {
    contextKind: "MEETING_WORKSPACE",
    defaultTab: "traktanden",
    tabQueryParam: "bereich",
    tabRoutes: Object.fromEntries(
      tabIds.map((key) => [key, "#"]),
    ) as ContextTabNavigationConfig<MeetingWorkspaceTabId>["tabRoutes"],
    tabs: tabIds.map((key) => ({
      key,
      label: formatMeetingWorkspaceTabLabel(key, counts),
      placement: "primary" as const,
      count: undefined,
    })),
  };
}

export function meetingWorkspaceSectionDomId(tab: MeetingWorkspaceTabId): string {
  return `meeting-workspace-section-${tab}`;
}
