"use client";

import { createContext, useContext, type ReactNode } from "react";

import {
  useWorkspaceFavorites,
  useWorkspaceRecentList,
} from "./useWorkspaceCollaboration";

type FavoritesContextValue = ReturnType<typeof useWorkspaceFavorites>;
type RecentContextValue = ReturnType<typeof useWorkspaceRecentList>;

const FavoritesContext = createContext<FavoritesContextValue | null>(null);
const RecentContext = createContext<RecentContextValue | null>(null);

export function WorkspaceCollaborationProvider({ children }: { children: ReactNode }) {
  const favorites = useWorkspaceFavorites();
  const recent = useWorkspaceRecentList();

  return (
    <FavoritesContext.Provider value={favorites}>
      <RecentContext.Provider value={recent}>{children}</RecentContext.Provider>
    </FavoritesContext.Provider>
  );
}

export function useWorkspaceFavoritesContext(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useWorkspaceFavoritesContext requires WorkspaceCollaborationProvider");
  }
  return ctx;
}

export function useOptionalWorkspaceFavoritesContext(): FavoritesContextValue | null {
  return useContext(FavoritesContext);
}

export function useWorkspaceRecentContext(): RecentContextValue {
  const ctx = useContext(RecentContext);
  if (!ctx) {
    throw new Error("useWorkspaceRecentContext requires WorkspaceCollaborationProvider");
  }
  return ctx;
}
