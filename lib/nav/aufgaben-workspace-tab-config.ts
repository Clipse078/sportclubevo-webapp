import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";
import type { AufgabenBereich } from "@/lib/personal-actions/aufgaben-scope";
import { buildAufgabenBereichHref } from "@/lib/personal-actions/aufgaben-scope";

export type AufgabenWorkspaceTabId = Extract<AufgabenBereich, "meine" | "verwaltung">;

const BASE = "/dashboard/aufgaben";

export const AUFGABEN_WORKSPACE_CANONICAL_SUBTITLE =
  "Alles, was erledigt, bestätigt oder beantwortet werden muss." as const;

export function buildAufgabenWorkspaceTabNavigationConfig(options: {
  showMeine: boolean;
  showVerwaltung: boolean;
  basePath?: string;
}): ContextTabNavigationConfig<AufgabenWorkspaceTabId> {
  const basePath = options.basePath ?? BASE;

  const tabs: ContextTabNavigationConfig<AufgabenWorkspaceTabId>["tabs"] = [];

  if (options.showMeine) {
    tabs.push({ key: "meine", label: "Meine Aufgaben", placement: "primary" });
  }

  if (options.showVerwaltung) {
    tabs.push({ key: "verwaltung", label: "Verwaltung", placement: "primary" });
  }

  const defaultTab: AufgabenWorkspaceTabId = options.showMeine
    ? "meine"
    : options.showVerwaltung
      ? "verwaltung"
      : "meine";

  return {
    contextKind: "AUFGABEN_WORKSPACE",
    defaultTab,
    tabQueryParam: "bereich",
    tabRoutes: {
      meine: buildAufgabenBereichHref("meine", basePath),
      verwaltung: buildAufgabenBereichHref("verwaltung", basePath),
    },
    tabs,
  };
}

export const AUFGABEN_WORKSPACE_SUBTITLES: Record<AufgabenWorkspaceTabId, string> = {
  meine: "Was du persönlich erledigen oder bestätigen musst.",
  verwaltung: "Aufgaben und Anforderungen koordinieren und nachverfolgen.",
};
