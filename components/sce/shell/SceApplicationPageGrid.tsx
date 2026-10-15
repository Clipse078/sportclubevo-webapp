import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  SCE_APP_SHELL_PAGE_GRID_CLASS,
  SCE_APP_SHELL_RAIL_SPACER_CLASS,
  SCE_APP_SHELL_WORKSPACE_CLASS,
} from "@/lib/shell/sce-application-grid";

type SceApplicationPageGridProps = {
  children: ReactNode;
  className?: string;
  workspaceClassName?: string;
};

/**
 * Canonical authenticated page grid: persistent brand rail column + shared workspace column.
 * Navigation spine and page content consume the same workspace left edge at desktop widths.
 */
export function SceApplicationPageGrid({
  children,
  className,
  workspaceClassName,
}: SceApplicationPageGridProps) {
  return (
    <div className={cn(SCE_APP_SHELL_PAGE_GRID_CLASS, className)} data-sce-app-shell-page-grid>
      <div
        className={SCE_APP_SHELL_RAIL_SPACER_CLASS}
        data-sce-app-shell-rail-spacer
        aria-hidden
      />
      <div
        className={cn(SCE_APP_SHELL_WORKSPACE_CLASS, workspaceClassName)}
        data-sce-app-shell-workspace
      >
        {children}
      </div>
    </div>
  );
}
