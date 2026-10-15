"use client";

import type { ReactNode } from "react";
import { SceNavigationSpineRow } from "@/components/sce/navigation/SceNavigationSpineRow";
import { cn } from "@/lib/cn";

type SceTenantContextRowProps = {
  ariaLabel: string;
  brand: ReactNode;
  workspace?: ReactNode;
  className?: string;
  emptyWorkspaceTestId?: string;
};

/**
 * Persistent desktop Row 2 shell: tenant identity rail + contextual workspace (L2 or intentionally empty).
 */
export function SceTenantContextRow({
  ariaLabel,
  brand,
  workspace,
  className,
  emptyWorkspaceTestId = "sce-row2-context-workspace-empty",
}: SceTenantContextRowProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn("sce-global-module-nav hidden md:block", className)}
      data-testid="domain-secondary-nav"
    >
      <SceNavigationSpineRow
        variant="module"
        brand={brand}
        workspace={
          workspace ?? (
            <div
              className="sce-global-module-nav-track min-w-0 w-full min-h-[var(--sce-nav-module-row-height)]"
              data-testid={emptyWorkspaceTestId}
              aria-hidden
            />
          )
        }
      />
    </nav>
  );
}
