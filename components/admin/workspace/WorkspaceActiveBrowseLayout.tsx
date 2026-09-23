"use client";

import { useState, type ReactNode } from "react";

import { WorkspaceThreePaneLayout } from "./layout/WorkspaceThreePaneLayout";
import { WorkspaceLayoutProvider } from "./layout/WorkspaceLayoutContext";
import {
  persistWorkspaceInspectorOpen,
  readStoredWorkspaceInspectorOpen,
} from "@/lib/workspace/ui/workspace-pane-preferences";

type Props = {
  nav: ReactNode;
  navDrawerTitle: string;
  main: ReactNode;
  inspector: ReactNode;
  /** When true, inspector slot has meaningful content (folder or document context). */
  hasInspectorContext: boolean;
};

export function WorkspaceActiveBrowseLayout({
  nav,
  navDrawerTitle,
  main,
  inspector,
  hasInspectorContext,
}: Props) {
  const [inspectorOpen, setInspectorOpen] = useState(() => readStoredWorkspaceInspectorOpen());

  function handleInspectorOpenChange(open: boolean) {
    setInspectorOpen(open);
    persistWorkspaceInspectorOpen(open);
  }

  function toggleInspector() {
    handleInspectorOpenChange(!inspectorOpen);
  }

  const panelOpen = hasInspectorContext && inspectorOpen;

  return (
    <WorkspaceLayoutProvider value={{ inspectorOpen: panelOpen, toggleInspector }}>
      <WorkspaceThreePaneLayout
        nav={nav}
        navDrawerTitle={navDrawerTitle}
        main={main}
        inspector={inspector}
        inspectorOpen={panelOpen}
        onInspectorOpenChange={handleInspectorOpenChange}
      />
    </WorkspaceLayoutProvider>
  );
}
