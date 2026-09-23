"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, Star } from "lucide-react";
import { useTranslations } from "next-intl";

import type { WorkspaceLifecycleNavView } from "./WorkspaceLifecycleNavigation";

type Props = {
  children: React.ReactNode;
};

function buildBrowseHref(
  input: {
    folder: string | null;
    hub?: "browse" | "favorites" | "recent";
    view?: WorkspaceLifecycleNavView;
  },
): string {
  const params = new URLSearchParams();
  if (input.folder) params.set("folder", input.folder);
  if (input.hub && input.hub !== "browse") params.set("hub", input.hub);
  if (input.view && input.view !== "active") params.set("view", input.view);
  const qs = params.toString();
  return qs ? `/dashboard/workspace?${qs}` : "/dashboard/workspace";
}

export function WorkspaceSidebarNavigation({ children }: Props) {
  const tNav = useTranslations("Workspace.navigation");
  const tLifecycle = useTranslations("Workspace.lifecycle");
  const searchParams = useSearchParams();
  const folder = searchParams.get("folder");
  const hub = searchParams.get("hub") ?? "browse";
  const viewParam = searchParams.get("view");
  const lifecycleView: WorkspaceLifecycleNavView =
    viewParam === "archived" || viewParam === "trash" ? viewParam : "active";

  const workLinks = [
    {
      id: "recent" as const,
      href: buildBrowseHref({ folder, hub: "recent", view: "active" }),
      label: tNav("recent"),
      icon: Clock,
      active: lifecycleView === "active" && hub === "recent",
    },
    {
      id: "favorites" as const,
      href: buildBrowseHref({ folder, hub: "favorites", view: "active" }),
      label: tNav("favorites"),
      icon: Star,
      active: lifecycleView === "active" && hub === "favorites",
    },
  ];

  const maintenanceLinks = [
    {
      id: "archived" as const,
      href: buildBrowseHref({ folder, view: "archived" }),
      label: tLifecycle("archived"),
      active: lifecycleView === "archived",
    },
    {
      id: "trash" as const,
      href: buildBrowseHref({ folder, view: "trash" }),
      label: tLifecycle("trash"),
      active: lifecycleView === "trash",
    },
  ];

  const foldersActive =
    lifecycleView === "active" && (hub === "browse" || !hub);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <nav aria-label={tNav("workSectionAria")} className="shrink-0 px-2 pb-2 pt-1">
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {tNav("workSection")}
        </p>
        <ul className="space-y-px">
          {workLinks.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  scroll={false}
                  aria-current={item.active ? "page" : undefined}
                  className={[
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
                    item.active
                      ? "bg-[var(--blue-light)] text-[var(--blue)]"
                      : "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-[var(--border)]">
        <p
          className={[
            "shrink-0 px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide",
            foldersActive ? "text-[var(--text)]" : "text-[var(--muted)]",
          ].join(" ")}
        >
          {tNav("foldersSection")}
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>

      <nav
        aria-label={tNav("maintenanceSectionAria")}
        className="shrink-0 border-t border-[var(--border)] px-2 py-2"
      >
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {tNav("maintenanceSection")}
        </p>
        <ul className="space-y-px">
          {maintenanceLinks.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                scroll={false}
                aria-current={item.active ? "page" : undefined}
                className={[
                  "block rounded-md px-2 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
                  item.active
                    ? "bg-[var(--surface-2)] text-[var(--text)]"
                    : "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
                ].join(" ")}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
