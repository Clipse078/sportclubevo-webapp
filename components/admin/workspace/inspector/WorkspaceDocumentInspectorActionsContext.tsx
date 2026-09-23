"use client";

import { createContext, useContext } from "react";

type WorkspaceDocumentInspectorActions = {
  onOpenVersionHistory: () => void;
  onManageDocumentAccess: () => void;
  requirementCreateOpen: boolean;
  setRequirementCreateOpen: (open: boolean) => void;
};

const WorkspaceDocumentInspectorActionsContext =
  createContext<WorkspaceDocumentInspectorActions | null>(null);

export function WorkspaceDocumentInspectorActionsProvider({
  value,
  children,
}: {
  value: WorkspaceDocumentInspectorActions;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceDocumentInspectorActionsContext.Provider value={value}>
      {children}
    </WorkspaceDocumentInspectorActionsContext.Provider>
  );
}

export function useWorkspaceDocumentInspectorActions(): WorkspaceDocumentInspectorActions {
  const ctx = useContext(WorkspaceDocumentInspectorActionsContext);
  return (
    ctx ?? {
      onOpenVersionHistory: () => undefined,
      onManageDocumentAccess: () => undefined,
      requirementCreateOpen: false,
      setRequirementCreateOpen: () => undefined,
    }
  );
}
