"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export type WorkspaceLifecycleNavView = "active" | "archived" | "trash";

type WorkspaceLifecycleNavigationProps = {
  currentView: WorkspaceLifecycleNavView;
};

function buildHref(
  view: WorkspaceLifecycleNavView,
  folder: string | null,
): string {
  const params = new URLSearchParams();
  if (folder) params.set("folder", folder);
  if (view !== "active") params.set("view", view);
  const qs = params.toString();
  return qs ? `/dashboard/workspace?${qs}` : "/dashboard/workspace";
}

export function WorkspaceLifecycleNavigation({
  currentView,
}: WorkspaceLifecycleNavigationProps) {
  const t = useTranslations("Workspace.lifecycle");
  const searchParams = useSearchParams();
  const folder = searchParams.get("folder");

  const items: { id: WorkspaceLifecycleNavView; label: string }[] = [
    { id: "active", label: t("active") },
    { id: "archived", label: t("archived") },
    { id: "trash", label: t("trash") },
  ];

  return (
    <nav
      aria-label={t("navAriaLabel")}
      className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1"
    >
      {items.map((item) => {
        const selected = currentView === item.id;
        return (
          <Link
            key={item.id}
            href={buildHref(item.id, folder)}
            aria-current={selected ? "page" : undefined}
            className={[
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
              selected
                ? "bg-[var(--surface-2)] text-[var(--text)] shadow-sm"
                : "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
