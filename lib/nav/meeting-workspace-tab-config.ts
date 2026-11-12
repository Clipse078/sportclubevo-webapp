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
  massnahmen: "Massnahmen & Aufgaben",
  teilnehmer: "Teilnehmer",
  details: "Sitzungsdetails",
};

export function buildMeetingWorkspaceTabNavigationConfig(counts: {
  traktanden: number;
  beschluesse: number;
  massnahmen: number;
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
      label: TAB_LABELS[key],
      placement: "primary" as const,
      count:
        key === "details"
          ? undefined
          : counts[key as keyof typeof counts] > 0
            ? counts[key as keyof typeof counts]
            : undefined,
    })),
  };
}

export function meetingWorkspaceSectionDomId(tab: MeetingWorkspaceTabId): string {
  return `meeting-workspace-section-${tab}`;
}
