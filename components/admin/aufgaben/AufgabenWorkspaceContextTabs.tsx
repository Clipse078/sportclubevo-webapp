"use client";

import SceContextTabs from "@/components/sce/context-tabs/SceContextTabs";
import { SceContextTabProvider } from "@/lib/context-tabs/use-context-detail-tab";
import { buildAufgabenWorkspaceTabNavigationConfig } from "@/lib/nav/aufgaben-workspace-tab-config";

type Props = {
  showManagement: boolean;
  showRequirements: boolean;
  basePath?: string;
};

/**
 * Aufgaben module — canonical `SceContextTabs` (DS-10 R4).
 * Preserves legacy `?bereich=` deep links via `tabQueryParam`.
 */
export default function AufgabenWorkspaceContextTabs({
  showManagement,
  showRequirements,
  basePath,
}: Props) {
  if (!showManagement && !showRequirements) {
    return null;
  }

  const config = buildAufgabenWorkspaceTabNavigationConfig({
    showManagement,
    showRequirements,
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
