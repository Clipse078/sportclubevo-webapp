import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type MeetingWorkspaceTabId =
  | "traktanden"
  | "beschluesse"
  | "pendenzen"
  | "teilnehmer"
  | "details";

const TAB_LABELS: Record<MeetingWorkspaceTabId, string> = {
  traktanden: "Traktanden",
  beschluesse: "Beschlüsse",
  pendenzen: "Pendenzen",
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
    pendenzenOpen: number;
    teilnehmer: number;
  },
): string {
  if (tabId === "details") return TAB_LABELS.details;
  if (tabId === "pendenzen") {
    return tabLabelWithCount(TAB_LABELS.pendenzen, counts.pendenzenOpen);
  }
  const key = tabId as keyof typeof counts;
  return tabLabelWithCount(TAB_LABELS[tabId], counts[key]);
}

export function buildMeetingWorkspaceTabNavigationConfig(counts: {
  traktanden: number;
  beschluesse: number;
  pendenzenOpen: number;
  teilnehmer: number;
}): ContextTabNavigationConfig<MeetingWorkspaceTabId> {
  const tabIds: MeetingWorkspaceTabId[] = [
    "traktanden",
    "beschluesse",
    "pendenzen",
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
