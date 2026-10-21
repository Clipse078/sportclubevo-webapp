import type { ReactNode } from "react";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import type { AufgabenBereich } from "@/lib/personal-actions/aufgaben-scope";
import { AUFGABEN_WORKSPACE_SUBTITLES } from "@/lib/nav/aufgaben-workspace-tab-config";
import AufgabenWorkspaceContextTabs from "./AufgabenWorkspaceContextTabs";

type Props = {
  bereich: AufgabenBereich;
  showManagement: boolean;
  showRequirements: boolean;
  basePath?: string;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  children: ReactNode;
};

/**
 * Single canonical Aufgaben workspace — stable header + context tabs + content (DS-10 R4).
 */
export default function AufgabenWorkspaceShell({
  bereich,
  showManagement,
  showRequirements,
  basePath,
  primaryAction,
  secondaryActions,
  children,
}: Props) {
  const showContextTabs = showManagement || showRequirements;

  return (
    <div
      className="mx-auto w-full max-w-[120rem] px-4 py-4 sm:px-6"
      data-testid="aufgaben-workspace-shell"
      data-aufgaben-bereich={bereich}
    >
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Aufgaben" },
        ]}
        header={{
          title: "Aufgaben",
          description: AUFGABEN_WORKSPACE_SUBTITLES[bereich],
          primaryAction,
          secondaryActions,
        }}
        contextTabs={
          showContextTabs ? (
            <AufgabenWorkspaceContextTabs
              showManagement={showManagement}
              showRequirements={showRequirements}
              basePath={basePath}
            />
          ) : undefined
        }
        density="dense"
      >
        {children}
      </SceWorkspaceChrome>
    </div>
  );
}
