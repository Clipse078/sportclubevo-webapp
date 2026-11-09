import type { ReactNode } from "react";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";

type Props = {
  breadcrumbLeaf: string;
  title: string;
  subtitle: string;
  subtitleTestId?: string;
  actions?: ReactNode;
  /** When true, skip Planung › leaf breadcrumb (global shell already shows context nav). */
  showDomainBreadcrumb?: boolean;
  /** Optional context tabs (perspective switcher) rendered below the header. */
  contextTabs?: ReactNode;
};

export default function PlanningManagementPageHeader({
  breadcrumbLeaf,
  title,
  subtitle,
  subtitleTestId,
  actions,
  showDomainBreadcrumb = false,
  contextTabs,
}: Props) {
  const breadcrumbs = showDomainBreadcrumb
    ? [
        { label: "Planung" },
        { label: breadcrumbLeaf },
      ]
    : [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Planung" },
        { label: breadcrumbLeaf },
      ];

  return (
    <SceWorkspaceChrome
      breadcrumbs={breadcrumbs}
      contextTabs={contextTabs}
      header={{
        eyebrow: "Planung",
        title,
        description: subtitle,
        descriptionTestId: subtitleTestId,
        primaryAction: actions,
      }}
      density="dense"
    />
  );
}
