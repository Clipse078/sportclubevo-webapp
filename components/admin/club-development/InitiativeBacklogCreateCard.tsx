"use client";

import CreateInitiativeWorkspaceCollapsibleCard from "@/components/admin/initiatives/CreateInitiativeWorkspaceCollapsibleCard";

type Props = {
  defaultExpanded?: boolean;
  canCreate: boolean;
  onCreated?: () => void;
  filterTarget?: { id: string; title: string } | null;
};

/**
 * @deprecated Use CreateInitiativeWorkspaceCollapsibleCard with variant="prioritaeten".
 * Retained as a thin adapter for tests and imports.
 */
export default function InitiativeBacklogCreateCard({
  canCreate,
  onCreated,
  filterTarget = null,
}: Props) {
  return (
    <CreateInitiativeWorkspaceCollapsibleCard
      canCreate={canCreate}
      filterTarget={filterTarget}
      onCreated={onCreated}
      variant="prioritaeten"
      collapseToggleTestId="initiative-backlog-create-initiative"
      cardTestId="initiative-backlog-create-card"
    />
  );
}