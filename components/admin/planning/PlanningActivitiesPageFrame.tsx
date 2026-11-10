import type { ReactNode } from "react";
import { PageShell } from "@/components/ui/page";
import type { BreadcrumbItem } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import type { ScePageWidthMode } from "@/lib/shell/sce-page-layout";

export { SceWorkspaceChrome };

export type PlanningActivitiesBreadcrumbSegment = {
  label: string;
  href?: string;
};

/** Finance-style planning breadcrumbs: Dashboard › Planung › … › leaf. */
export function buildPlanningActivitiesBreadcrumbs(
  leaf: string,
  trail: readonly PlanningActivitiesBreadcrumbSegment[] = [],
): BreadcrumbItem[] {
  return [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Planung", href: "/dashboard/planner/week" },
    ...trail.map((segment) => ({
      label: segment.label,
      href: segment.href,
    })),
    { label: leaf },
  ];
}

export type PlanningActivitiesPageFrameProps = {
  title: string;
  description?: string;
  breadcrumbLeaf: string;
  breadcrumbTrail?: readonly PlanningActivitiesBreadcrumbSegment[];
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  contextTabs?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  shellClassName?: string;
  fullWidth?: boolean;
  widthMode?: ScePageWidthMode;
  density?: "standard" | "dense";
  descriptionTestId?: string;
};

export function PlanningActivitiesPageFrame({
  title,
  description,
  breadcrumbLeaf,
  breadcrumbTrail,
  primaryAction,
  secondaryActions,
  contextTabs,
  children,
  className,
  contentClassName,
  shellClassName,
  fullWidth,
  widthMode,
  density = "dense",
  descriptionTestId,
}: PlanningActivitiesPageFrameProps) {
  return (
    <PageShell className={shellClassName} fullWidth={fullWidth} widthMode={widthMode}>
      <SceWorkspaceChrome
        className={className}
        contentClassName={contentClassName}
        breadcrumbs={buildPlanningActivitiesBreadcrumbs(breadcrumbLeaf, breadcrumbTrail)}
        contextTabs={contextTabs}
        density={density}
        header={{
          eyebrow: "Planung",
          title,
          description,
          descriptionTestId,
          primaryAction,
          secondaryActions,
        }}
      >
        {children}
      </SceWorkspaceChrome>
    </PageShell>
  );
}
