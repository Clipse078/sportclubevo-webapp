import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";
import { CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_CONTEXT } from "@/lib/club-events/governance/club-event-governance-people-access-context";

export type PersonDetailTabId =
  | "uebersicht"
  | "rollen-funktionen"
  | "bereiche"
  | "veranstaltungs-freigaben"
  | "zugriff";

export const PERSON_DETAIL_TAB_QUERY_PARAM = "tab";

export function resolvePersonDetailDefaultTab(input: {
  fromClubEventGovernance: boolean;
  hasLinkedPerson: boolean;
}): PersonDetailTabId {
  if (input.fromClubEventGovernance && input.hasLinkedPerson) {
    return "veranstaltungs-freigaben";
  }
  return "uebersicht";
}

export function buildPersonDetailTabHref(input: {
  userId: string;
  tab: PersonDetailTabId;
  returnContext?: typeof CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_CONTEXT;
}): string {
  const params = new URLSearchParams();
  if (input.returnContext) {
    params.set("returnContext", input.returnContext);
  }
  params.set(PERSON_DETAIL_TAB_QUERY_PARAM, input.tab);
  return `/dashboard/admin/users/${encodeURIComponent(input.userId)}?${params.toString()}`;
}

export function buildPersonDetailTabNavigationConfig(input: {
  showClubEventGovernance: boolean;
  defaultTab: PersonDetailTabId;
}): ContextTabNavigationConfig<PersonDetailTabId> {
  const tabs: ContextTabNavigationConfig<PersonDetailTabId>["tabs"] = [
    { key: "uebersicht", label: "Übersicht", placement: "primary" },
    { key: "rollen-funktionen", label: "Rollen & Funktionen", placement: "primary" },
    { key: "bereiche", label: "Bereiche & Zuständigkeiten", placement: "primary" },
  ];

  if (input.showClubEventGovernance) {
    tabs.push({
      key: "veranstaltungs-freigaben",
      label: "Veranstaltungs-Freigaben",
      placement: "primary",
    });
  }

  tabs.push({ key: "zugriff", label: "Zugriff", placement: "primary" });

  return {
    contextKind: "PERSON_ADMIN_DETAIL",
    defaultTab: input.defaultTab,
    tabs,
  };
}
