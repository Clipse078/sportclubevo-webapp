"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SceNavigationSpineRowVariant = "primary" | "module" | "context";

type SceNavigationSpineRowProps = {
  variant: SceNavigationSpineRowVariant;
  brand?: ReactNode;
  workspace: ReactNode;
  utilities?: ReactNode;
  className?: string;
};

/**
 * Shared desktop navigation grid: brand rail | left-aligned workspace | utilities (L1 only).
 * L2/L3 reuse the same brand column width with an intentional empty rail cell for spine alignment.
 */
export function SceNavigationSpineRow({
  variant,
  brand,
  workspace,
  utilities,
  className,
}: SceNavigationSpineRowProps) {
  const isPrimary = variant === "primary";
  const showUtilities = isPrimary || utilities != null;

  return (
    <div
      className={cn(
        "sce-nav-spine-row",
        isPrimary ? "sce-nav-spine-row--primary" : "sce-nav-spine-row--sub",
        !isPrimary && utilities != null && "sce-nav-spine-row--with-utilities",
        className,
      )}
      data-sce-nav-spine-row={variant}
    >
      <div
        className="sce-nav-spine-brand-cell"
        data-sce-nav-brand-rail={brand ? "occupied" : "spacer"}
      >
        {brand ?? null}
      </div>
      <div className="sce-nav-spine-workspace-cell" data-sce-nav-workspace>
        {workspace}
      </div>
      {showUtilities ? (
        <div className="sce-nav-spine-utilities-cell" data-sce-nav-utilities>
          {utilities}
        </div>
      ) : null}
    </div>
  );
}
