"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type FavoriteItem = {
  resourceType: "FOLDER" | "DOCUMENT";
  resourceId: string;
  lifecycle: string;
};

type RecentItem = FavoriteItem & {
  versionId: string | null;
  accessedAt: string;
};

export function WorkspaceDiscoveryPanel() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);

  useEffect(() => {
    void (async () => {
      const [favRes, recentRes] = await Promise.all([
        fetch("/api/workspace/favorites"),
        fetch("/api/workspace/recent"),
      ]);
      if (favRes.ok) {
        const data = (await favRes.json()) as { favorites: FavoriteItem[] };
        setFavorites(data.favorites ?? []);
      }
      if (recentRes.ok) {
        const data = (await recentRes.json()) as { recent: RecentItem[] };
        setRecent(data.recent ?? []);
      }
    })();
  }, []);

  function hrefFor(item: FavoriteItem): string {
    if (item.resourceType === "FOLDER") {
      return `/dashboard/workspace?folder=${encodeURIComponent(item.resourceId)}`;
    }
    return `/dashboard/workspace?document=${encodeURIComponent(item.resourceId)}`;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/dashboard/workspace?view=archived" className="text-[var(--blue)] hover:underline">
          Archiviert
        </Link>
        <Link href="/dashboard/workspace?view=trash" className="text-[var(--blue)] hover:underline">
          Papierkorb
        </Link>
      </div>

      {favorites.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Favoriten
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {favorites.map((item) => (
              <li key={`${item.resourceType}:${item.resourceId}`}>
                <Link href={hrefFor(item)} className="hover:underline">
                  {item.resourceType === "FOLDER" ? "Ordner" : "Dokument"} ·{" "}
                  {item.lifecycle.toLowerCase()}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {recent.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Zuletzt
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {recent.map((item) => (
              <li key={`${item.resourceType}:${item.resourceId}:${item.accessedAt}`}>
                <Link href={hrefFor(item)} className="hover:underline">
                  {item.resourceType === "FOLDER" ? "Ordner" : "Dokument"}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
