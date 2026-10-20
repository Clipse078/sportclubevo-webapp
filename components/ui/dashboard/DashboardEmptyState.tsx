import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SceEmptyState } from "@/components/sce/feedback/SceEmptyState";
import type { SceEmptyStateVariant } from "@/lib/design-system/sce-feedback-status-foundation";

export type DashboardEmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Compact layout for personal dashboard cards with no data. */
  variant?: "default" | "compact" | "cockpit";
  variantSemantic?: SceEmptyStateVariant;
  /**
   * With `variant="compact"`, `inline` places icon beside the title (personal cards).
   * Default stacked compact keeps centered icon + text (other dashboard sections).
   */
  compactLayout?: "stacked" | "inline";
  className?: string;
};

function mapLayout(
  variant: DashboardEmptyStateProps["variant"],
  compactLayout: DashboardEmptyStateProps["compactLayout"],
): "centered" | "compact-inline" | "compact-stacked" | "cockpit" {
  if (variant === "cockpit") return "cockpit";
  if (variant === "compact" && compactLayout === "inline") return "compact-inline";
  if (variant === "compact") return "compact-stacked";
  return "centered";
}

/**
 * Centered empty state for dashboard sections with no data (DS-07 bridge).
 */
export function DashboardEmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
  variantSemantic = "NO_DATA",
  compactLayout = "stacked",
  className,
}: DashboardEmptyStateProps) {
  return (
    <SceEmptyState
      variant={variantSemantic}
      icon={icon}
      title={title}
      description={description}
      action={action}
      layout={mapLayout(variant, compactLayout)}
      className={cn(className)}
    />
  );
}
