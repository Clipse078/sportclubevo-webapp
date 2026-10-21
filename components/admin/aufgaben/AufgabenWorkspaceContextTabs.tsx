"use client";

import SceContextTabs from "@/components/sce/context-tabs/SceContextTabs";
import { SceContextTabProvider } from "@/lib/context-tabs/use-context-detail-tab";
import { buildAufgabenWorkspaceTabNavigationConfig } from "@/lib/nav/aufgaben-workspace-tab-config";

type Props = {
  showMeine: boolean;
  showVerwaltung: boolean;
  basePath?: string;
};

/**
 * Aufgaben module — canonical `SceContextTabs` (DS-10 R4.2: Meine Aufgaben + Verwaltung).
 * Preserves legacy `?bereich=` deep links via `tabQueryParam`.
 */
export default function AufgabenWorkspaceContextTabs({
  showMeine,
  showVerwaltung,
  basePath,
}: Props) {
  if (!showMeine && !showVerwaltung) {
    return null;
  }

  const config = buildAufgabenWorkspaceTabNavigationConfig({
    showMeine,
    showVerwaltung,
    basePath,
  });

  return (
    <SceContextTabProvider config={config}>
      <SceContextTabs
        config={config}
        ariaLabel="Aufgaben"
        testId="aufgaben-bereich"
        idPrefix="aufgaben-bereich"
      />
    </SceContextTabProvider>
  );
}
