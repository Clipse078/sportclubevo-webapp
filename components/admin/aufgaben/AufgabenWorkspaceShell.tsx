import type { ReactNode } from "react";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import type { AufgabenWorkspaceTabId } from "@/lib/nav/aufgaben-workspace-tab-config";
import {
  AUFGABEN_WORKSPACE_CANONICAL_SUBTITLE,
  AUFGABEN_WORKSPACE_SUBTITLES,
} from "@/lib/nav/aufgaben-workspace-tab-config";
import AufgabenWorkspaceContextTabs from "./AufgabenWorkspaceContextTabs";

type Props = {
  bereich: AufgabenWorkspaceTabId;
  showMeine: boolean;
  showVerwaltung: boolean;
  basePath?: string;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  children: ReactNode;
};

/**
 * Single canonical Aufgaben workspace — stable header + context tabs + content (DS-10 R4 / R4.2).
 */
export default function AufgabenWorkspaceShell({
  bereich,
  showMeine,
  showVerwaltung,
  basePath,
  primaryAction,
  secondaryActions,
  children,
}: Props) {
  const showContextTabs = showMeine || showVerwaltung;
  const description =
    bereich === "meine"
      ? AUFGABEN_WORKSPACE_SUBTITLES.meine
      : bereich === "verwaltung"
        ? AUFGABEN_WORKSPACE_SUBTITLES.verwaltung
        : AUFGABEN_WORKSPACE_CANONICAL_SUBTITLE;

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
          description,
          primaryAction,
          secondaryActions,
        }}
        contextTabs={
          showContextTabs ? (
            <AufgabenWorkspaceContextTabs
              showMeine={showMeine}
              showVerwaltung={showVerwaltung}
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
