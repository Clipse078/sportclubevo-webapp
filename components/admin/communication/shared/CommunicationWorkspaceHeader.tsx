import type { ReactNode } from "react";
import { SceBreadcrumbs } from "@/components/sce/navigation/SceBreadcrumbs";
import { SceWorkspaceHeader } from "@/components/sce/workspace/SceWorkspaceHeader";
import type { BreadcrumbItem } from "@/components/ui/page";

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
  return (
    <>
      <SceBreadcrumbs items={breadcrumbs} />
      <SceWorkspaceHeader
        eyebrow="Kommunikation"
        title={title}
        description={description}
        secondaryActions={secondaryActions}
        primaryAction={primaryAction}
      />
    </>
  );
}
