"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export type WorkspaceDiscoveryTab = "browse" | "favorites" | "recent";

export function resolveWorkspaceDiscoveryTab(raw: string | null): WorkspaceDiscoveryTab {
  if (raw === "favorites" || raw === "recent") return raw;
  return "browse";
}

export function WorkspaceDiscoveryTabs() {
  const t = useTranslations("Workspace.discovery");
  const searchParams = useSearchParams();
  const current = resolveWorkspaceDiscoveryTab(searchParams.get("hub"));

  function hrefFor(tab: WorkspaceDiscoveryTab): string {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "browse") {
      params.delete("hub");
    } else {
      params.set("hub", tab);
    }
    const qs = params.toString();
    return qs ? `/dashboard/workspace?${qs}` : "/dashboard/workspace";
  }

  const tabs: { id: WorkspaceDiscoveryTab; label: string }[] = [
    { id: "browse", label: t("browseTab") },
    { id: "favorites", label: t("favoritesTab") },
    { id: "recent", label: t("recentTab") },
  ];

  return (
    <nav aria-label={t("navAriaLabel")} className="flex flex-wrap gap-1">
      {tabs.map((tab) => {
        const active = current === tab.id;
        return (
          <Link
            key={tab.id}
            href={hrefFor(tab.id)}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] ${
              active
                ? "bg-[var(--blue-light)] text-[var(--blue)]"
                : "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
