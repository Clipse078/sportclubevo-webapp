import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  SCE_APP_SHELL_PAGE_GRID_CLASS,
  SCE_APP_SHELL_WORKSPACE_CLASS,
} from "@/lib/shell/sce-application-grid";

type SceApplicationPageGridProps = {
  children: ReactNode;
  className?: string;
  workspaceClassName?: string;
};

/**
 * Canonical authenticated page grid: responsive page gutters + full available content width.
 * Navigation brand rails do not reserve a page column (see SCE_PAGE_LAYOUT_RULE).
 */
export function SceApplicationPageGrid({
  children,
  className,
  workspaceClassName,
}: SceApplicationPageGridProps) {
  return (
    <div className={cn(SCE_APP_SHELL_PAGE_GRID_CLASS, className)} data-sce-app-shell-page-grid>
      <div
        className={cn(SCE_APP_SHELL_WORKSPACE_CLASS, workspaceClassName)}
        data-sce-app-shell-workspace
      >
        {children}
      </div>
    </div>
  );
}
