"use client";

import { createContext, useContext, type ReactNode } from "react";

type WorkspaceLayoutContextValue = {
  inspectorOpen: boolean;
  toggleInspector: () => void;
};

const WorkspaceLayoutContext = createContext<WorkspaceLayoutContextValue | null>(null);

export function WorkspaceLayoutProvider({
  value,
  children,
}: {
  value: WorkspaceLayoutContextValue;
  children: ReactNode;
}) {
  return (
    <WorkspaceLayoutContext.Provider value={value}>{children}</WorkspaceLayoutContext.Provider>
  );
}

export function useWorkspaceLayoutContext(): WorkspaceLayoutContextValue | null {
  return useContext(WorkspaceLayoutContext);
}
