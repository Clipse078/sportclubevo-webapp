"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type FavoriteItem = {
  resourceType: "FOLDER" | "DOCUMENT";
  resourceId: string;
  lifecycle: string;
};

type RecentItem = FavoriteItem & {
  versionId: string | null;
  accessedAt: string;
};

export function WorkspaceQuickDiscoveryPanel() {
  const t = useTranslations("Workspace.discovery");
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

  if (favorites.length === 0 && recent.length === 0) {
    return null;
  }

  function hrefFor(item: FavoriteItem): string {
    if (item.resourceType === "FOLDER") {
      return `/dashboard/workspace?folder=${encodeURIComponent(item.resourceId)}`;
    }
    return `/dashboard/workspace?document=${encodeURIComponent(item.resourceId)}`;
  }

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--text-2)]">
      {favorites.length > 0 ? (
        <div className="min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t("favoritesTitle")}
          </span>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {favorites.slice(0, 5).map((item) => (
              <li key={`${item.resourceType}:${item.resourceId}`}>
                <Link href={hrefFor(item)} className="hover:text-[var(--blue)] hover:underline">
                  {item.resourceType === "FOLDER" ? t("folderLabel") : t("documentLabel")}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {recent.length > 0 ? (
        <div className="min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t("recentTitle")}
          </span>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {recent.slice(0, 5).map((item) => (
              <li key={`${item.resourceType}:${item.resourceId}:${item.accessedAt}`}>
                <Link href={hrefFor(item)} className="hover:text-[var(--blue)] hover:underline">
                  {item.resourceType === "FOLDER" ? t("folderLabel") : t("documentLabel")}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
