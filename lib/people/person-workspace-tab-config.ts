import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type PersonWorkspaceTabId =
  | "uebersicht"
  | "stammdaten"
  | "organisation"
  | "spieler"
  | "trainer"
  | "sport"
  | "mitgliedschaft"
  | "finanzen"
  | "gesundheit"
  | "dokumente"
  | "zugang";

export function buildPersonWorkspaceTabNavigationConfig(input: {
  showSpielerTab: boolean;
  showTrainerTab: boolean;
  showSportTab: boolean;
  canViewFinance: boolean;
  canViewHealth: boolean;
  canViewPrivateDocuments: boolean;
  organisationCount?: number;
  sportRoleCount?: number;
}): ContextTabNavigationConfig<PersonWorkspaceTabId> {
  const tabs: ContextTabNavigationConfig<PersonWorkspaceTabId>["tabs"] = [
    { key: "uebersicht", label: "Übersicht", placement: "primary" },
    { key: "stammdaten", label: "Stammdaten", placement: "primary" },
    {
      key: "organisation",
      label: "Organisation",
      placement: "primary",
      count: input.organisationCount,
    },
    {
      key: "spieler",
      label: "Spieler",
      placement: "primary",
      visible: input.showSpielerTab,
    },
    {
      key: "trainer",
      label: "Trainer",
      placement: "primary",
      visible: input.showTrainerTab,
    },
    {
      key: "sport",
      label: "Sport & Entwicklung",
      placement: "primary",
      visible: input.showSportTab,
      count: input.sportRoleCount,
    },
    { key: "mitgliedschaft", label: "Mitgliedschaft", placement: "primary" },
    {
      key: "finanzen",
      label: "Finanzen",
      placement: "primary",
      visible: input.canViewFinance,
    },
    {
      key: "gesundheit",
      label: "Gesundheit",
      placement: "primary",
      visible: input.canViewHealth,
    },
    {
      key: "dokumente",
      label: "Dokumente",
      placement: "primary",
      visible: input.canViewPrivateDocuments,
    },
    { key: "zugang", label: "Zugang", placement: "primary" },
  ];

  return {
    contextKind: "PERSON_WORKSPACE",
    defaultTab: "uebersicht",
    tabs,
  };
}
