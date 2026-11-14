"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TabKey = "planung" | "board" | "rueckblick";

const TABS: { key: TabKey; label: string; href: (slug: string) => string }[] = [
  { key: "planung", label: "Planung", href: (slug) => `/vereinsleitung/sprints/${slug}` },
  { key: "board", label: "Board", href: (slug) => `/vereinsleitung/sprints/${slug}/board` },
  { key: "rueckblick", label: "Rückblick", href: (slug) => `/vereinsleitung/sprints/${slug}/rueckblick` },
];

function activeTab(pathname: string, slug: string): TabKey {
  if (pathname.endsWith(`/sprints/${slug}/board`)) return "board";
  if (pathname.endsWith(`/sprints/${slug}/rueckblick`)) return "rueckblick";
  return "planung";
}

type Props = {
  slug: string;
};

export default function DevelopmentSprintWorkspaceNav({ slug }: Props) {
  const pathname = usePathname() ?? "";
  const current = activeTab(pathname, slug);

  return (
    <nav
      className="flex flex-wrap gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1"
      aria-label="Sprint-Arbeitsbereich"
      data-testid="sprint-workspace-nav"
    >
      {TABS.map((tab) => {
        const isActive = tab.key === current;
        return (
          <Link
            key={tab.key}
            href={tab.href(slug)}
            className={[
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              isActive
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
            ].join(" ")}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}