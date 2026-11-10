import type { ReactNode } from "react";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import type { BreadcrumbItem } from "@/components/ui/page";

type CommunicationWorkspaceHeaderProps = {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  children?: ReactNode;
};

/**
 * Communication module chrome — delegates to canonical SceWorkspaceChrome.
 * Prefer importing SceWorkspaceChrome or page patterns directly in new routes.
 */
export function CommunicationWorkspaceHeader({
  breadcrumbs,
  title,
  description,
  primaryAction,
  secondaryActions,
  children,
}: CommunicationWorkspaceHeaderProps) {
  return (
    <SceWorkspaceChrome
      breadcrumbs={breadcrumbs}
      header={{
        eyebrow: "Kommunikation",
        title,
        description,
        primaryAction,
        secondaryActions,
      }}
    >
      {children}
    </SceWorkspaceChrome>
  );
}
