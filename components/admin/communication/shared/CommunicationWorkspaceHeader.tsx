import type { ReactNode } from "react";
import {
  PageActions,
  PageBreadcrumbs,
  PageHeader,
  type BreadcrumbItem,
} from "@/components/ui/page";

type CommunicationWorkspaceHeaderProps = {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
};

/**
 * Canonical Communication module page header (SCE-COMM-UX-01).
 * Breadcrumb + title block + right-aligned actions on one predictable row.
 */
export function CommunicationWorkspaceHeader({
  breadcrumbs,
  title,
  description,
  primaryAction,
  secondaryActions,
}: CommunicationWorkspaceHeaderProps) {
  const hasActions = Boolean(primaryAction || secondaryActions);

  return (
    <>
      <PageBreadcrumbs items={breadcrumbs} />
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          eyebrow="Kommunikation"
          title={title}
          description={description}
          className="mb-0 flex-1"
        />
        {hasActions ? (
          <PageActions className="shrink-0 lg:pt-1">
            {secondaryActions}
            {primaryAction}
          </PageActions>
        ) : null}
      </div>
    </>
  );
}
