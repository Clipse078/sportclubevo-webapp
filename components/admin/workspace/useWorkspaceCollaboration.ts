"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type CollaborationListItem = {
  resourceType: "FOLDER" | "DOCUMENT";
  resourceId: string;
  lifecycle: string;
  name: string;
  parentFolderName: string | null;
  createdAt?: string;
  accessedAt?: string;
};

type FavoriteKey = `${"FOLDER" | "DOCUMENT"}:${string}`;

function favoriteKey(resourceType: "FOLDER" | "DOCUMENT", resourceId: string): FavoriteKey {
  return `${resourceType}:${resourceId}`;
}

export function useWorkspaceFavorites() {
  const [items, setItems] = useState<CollaborationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingKeys, setPendingKeys] = useState<Set<FavoriteKey>>(new Set());

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/favorites");
      if (!res.ok) {
        setError("load_failed");
        setItems([]);
        return;
      }
      const data = (await res.json()) as { favorites: CollaborationListItem[] };
      setItems(data.favorites ?? []);
    } catch {
      setError("load_failed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const favoriteSet = useMemo(() => {
    const set = new Set<FavoriteKey>();
    for (const item of items) {
      set.add(favoriteKey(item.resourceType, item.resourceId));
    }
    return set;
  }, [items]);

  const toggleFavorite = useCallback(
    async (resourceType: "FOLDER" | "DOCUMENT", resourceId: string) => {
      const key = favoriteKey(resourceType, resourceId);
      setPendingKeys((prev) => new Set(prev).add(key));
      try {
        const res = await fetch("/api/workspace/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resourceType, resourceId }),
        });
        if (!res.ok) return;
        await reload();
      } finally {
        setPendingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [reload],
  );

  function isFavorite(resourceType: "FOLDER" | "DOCUMENT", resourceId: string): boolean {
    return favoriteSet.has(favoriteKey(resourceType, resourceId));
  }

  function isPending(resourceType: "FOLDER" | "DOCUMENT", resourceId: string): boolean {
    return pendingKeys.has(favoriteKey(resourceType, resourceId));
  }

  return {
    favorites: items,
    loading,
    error,
    reload,
    toggleFavorite,
    isFavorite,
    isPending,
  };
}

export function useWorkspaceRecentList() {
  const [items, setItems] = useState<CollaborationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/recent");
      if (!res.ok) {
        setError("load_failed");
        setItems([]);
        return;
      }
      const data = (await res.json()) as { recent: CollaborationListItem[] };
      setItems(data.recent ?? []);
    } catch {
      setError("load_failed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { recent: items, loading, error, reload };
}

export function useWorkspaceRecentRecorder(input: {
  folderId: string | null;
  documentId: string | null;
}) {
  useEffect(() => {
    if (!input.folderId && !input.documentId) return;
    void (async () => {
      try {
        await fetch("/api/workspace/recent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resourceType: input.documentId ? "DOCUMENT" : "FOLDER",
            resourceId: input.documentId ?? input.folderId,
          }),
        });
      } catch {
        // Non-blocking product telemetry
      }
    })();
  }, [input.documentId, input.folderId]);
}
