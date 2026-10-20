import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SceEmptyState } from "@/components/sce/feedback/SceEmptyState";
import type { SceEmptyStateVariant } from "@/lib/design-system/sce-feedback-status-foundation";

type EmptyStateProps = {
  /**
   * Icon to display above the heading.
   * Pass a Lucide icon component or any ReactNode.
   * Example: <FolderOpen className="h-10 w-10" />
   */
  icon?: ReactNode;
  /** Short, friendly heading. */
  heading: string;
  /** Optional supporting text with more context. */
  description?: string;
  /** Optional CTA button(s) rendered below the description. */
  action?: ReactNode;
  variant?: SceEmptyStateVariant;
  className?: string;
};

/**
 * EmptyState — canonical bridge to `SceEmptyState` (DS-07).
 */
export function EmptyState({
  icon,
  heading,
  description,
  action,
  variant = "NO_DATA",
  className,
}: EmptyStateProps) {
  return (
    <SceEmptyState
      variant={variant}
      icon={icon}
      title={heading}
      description={description}
      action={action}
      layout="centered"
      className={cn(className)}
      data-testid="sce-empty-state-legacy-bridge"
    />
  );
}
