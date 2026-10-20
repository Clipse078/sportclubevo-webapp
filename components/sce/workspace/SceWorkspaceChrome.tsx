import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SceBreadcrumbs, type SceBreadcrumbItem } from "@/components/sce/navigation/SceBreadcrumbs";
import { SceWorkspaceHeader, type SceWorkspaceHeaderProps } from "./SceWorkspaceHeader";

export type SceWorkspaceChromeProps = {
  breadcrumbs?: SceBreadcrumbItem[];
  header?: SceWorkspaceHeaderProps;
  contextTabs?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** When set, wraps main content in SceWorkspaceSurface rhythm (padding only). */
  density?: "standard" | "dense";
};

/**
 * Canonical workspace composition — breadcrumbs → header → optional context tabs → content.
 * One system; domain layouts may omit layers or use dense spacing.
 */
export function SceWorkspaceChrome({
  breadcrumbs,
  header,
  contextTabs,
  children,
  className,
  contentClassName,
  density = "standard",
}: SceWorkspaceChromeProps) {
  return (
    <div className={cn("min-w-0", className)} data-sce-workspace-chrome>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <SceBreadcrumbs items={breadcrumbs} />
      ) : null}
      {header ? <SceWorkspaceHeader {...header} /> : null}
      {contextTabs ? (
        <div className="mb-4 min-w-0 border-b border-[var(--sce-color-border-standard)]">
          {contextTabs}
        </div>
      ) : null}
      <div
        className={cn(
          density === "dense" ? "space-y-4" : "space-y-6",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
