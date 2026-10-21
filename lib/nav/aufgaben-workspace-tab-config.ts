import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";
import type { AufgabenBereich } from "@/lib/personal-actions/aufgaben-scope";
import { buildAufgabenBereichHref } from "@/lib/personal-actions/aufgaben-scope";

export type AufgabenWorkspaceTabId = AufgabenBereich;

const BASE = "/dashboard/aufgaben";

export function buildAufgabenWorkspaceTabNavigationConfig(options: {
  showManagement: boolean;
  showRequirements: boolean;
  basePath?: string;
}): ContextTabNavigationConfig<AufgabenWorkspaceTabId> {
  const basePath = options.basePath ?? BASE;

  const tabs: ContextTabNavigationConfig<AufgabenWorkspaceTabId>["tabs"] = [];

  if (options.showManagement) {
    tabs.push(
      { key: "meine", label: "Meine Aufgaben", placement: "primary" },
      { key: "verwaltung", label: "Aufgabenverwaltung", placement: "primary" },
    );
  }

  if (options.showRequirements) {
    tabs.push({
      key: "anforderungen",
      label: "Anforderungen",
      placement: "primary",
    });
  }

  return {
    contextKind: "AUFGABEN_WORKSPACE",
    defaultTab: options.showManagement ? "meine" : "anforderungen",
    tabQueryParam: "bereich",
    tabRoutes: {
      meine: buildAufgabenBereichHref("meine", basePath),
      verwaltung: buildAufgabenBereichHref("verwaltung", basePath),
      anforderungen: buildAufgabenBereichHref("anforderungen", basePath),
    },
    tabs,
  };
}

export const AUFGABEN_WORKSPACE_SUBTITLES: Record<AufgabenBereich, string> = {
  meine: "Was du persönlich erledigen oder bestätigen musst.",
  verwaltung: "Operatives Task Center — Arbeit im Verein koordinieren und nachverfolgen.",
  anforderungen:
    "Bestätigungen oder Handlungen, die mehrere Personen individuell erledigen müssen.",
};
