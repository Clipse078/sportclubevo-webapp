"use client";

import { useTranslations } from "next-intl";

import { SceBreadcrumbs } from "@/components/sce/navigation/SceBreadcrumbs";
import type { BreadcrumbItem } from "@/lib/workspace/breadcrumbs";

type WorkspaceBreadcrumbsProps = {
  path: BreadcrumbItem[];
};

/** Documents workspace folder trail — consumes canonical `SceBreadcrumbs` (DS-03). */
export function WorkspaceBreadcrumbs({ path }: WorkspaceBreadcrumbsProps) {
  const t = useTranslations("Workspace.breadcrumbs");

  const items = [
    { label: t("rootLabel"), href: "/dashboard/workspace" },
    ...path.map((segment, index) => {
      const isLast = index === path.length - 1;
      return {
        label: segment.name,
        href: isLast
          ? undefined
          : `/dashboard/workspace?folder=${encodeURIComponent(segment.id)}`,
      };
    }),
  ];

  return <SceBreadcrumbs items={items} ariaLabel="Workspace Pfad" />;
}
