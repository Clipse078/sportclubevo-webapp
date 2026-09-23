"use client";

import { useWorkspaceFavoritesContext, useWorkspaceRecentContext } from "./WorkspaceCollaborationProvider";
import { WorkspaceCollaborationHubPanel } from "./WorkspaceCollaborationHubPanel";
import type { WorkspaceDiscoveryTab } from "./WorkspaceDiscoveryTabs";

export function WorkspaceHubClient({ tab }: { tab: Exclude<WorkspaceDiscoveryTab, "browse"> }) {
  const favorites = useWorkspaceFavoritesContext();
  const recent = useWorkspaceRecentContext();

  if (tab === "favorites") {
    return (
      <WorkspaceCollaborationHubPanel
        mode="favorites"
        items={favorites.favorites}
        loading={favorites.loading}
        error={favorites.error}
      />
    );
  }

  return (
    <WorkspaceCollaborationHubPanel
      mode="recent"
      items={recent.recent}
      loading={recent.loading}
      error={recent.error}
    />
  );
}
