"use client";

import { usePathname, useRouter } from "next/navigation";
import { CD_SPRINT_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";

type TabKey = "planung" | "board" | "rueckblick";

const TABS: { key: TabKey; label: string; href: (slug: string) => string }[] = [
  {
    key: "planung",
    label: CD_SPRINT_WORKSPACE_COPY.tabPlanning,
    href: (slug) => `/vereinsleitung/sprints/${slug}`,
  },
  {
    key: "board",
    label: CD_SPRINT_WORKSPACE_COPY.tabTaskBoard,
    href: (slug) => `/vereinsleitung/sprints/${slug}/board`,
  },
  {
    key: "rueckblick",
    label: CD_SPRINT_WORKSPACE_COPY.tabReview,
    href: (slug) => `/vereinsleitung/sprints/${slug}/rueckblick`,
  },
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
  const router = useRouter();
  const current = activeTab(pathname, slug);

  return (
    <SceSegmentedControl
      value={current}
      options={TABS.map((tab) => ({ value: tab.key, label: tab.label }))}
      onChange={(next) => {
        const href = TABS.find((tab) => tab.key === next)?.href(slug);
        if (href) router.push(href);
      }}
      aria-label={CD_SPRINT_WORKSPACE_COPY.workspaceAria}
      testId="sprint-workspace-nav"
    />
  );
}