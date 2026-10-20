import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center gap-1",
    "rounded-full whitespace-nowrap font-medium",
    "leading-none",
  ],
  {
    variants: {
      variant: {
        default:   "border border-[var(--sce-color-border-standard)] bg-[var(--sce-color-surface-elevated)] text-[var(--sce-color-text-secondary)]",
        primary:   "bg-[var(--sce-primary-light)] text-[var(--sce-color-accent-primary)]",
        secondary: "bg-[var(--sce-activity-match-subtle)] text-[var(--sce-activity-match)]",
        success:   "bg-[var(--sce-success-light)] text-[var(--sce-color-status-success)]",
        warning:   "bg-[var(--sce-warning-light)] text-[var(--sce-color-status-warning)]",
        danger:    "bg-[var(--sce-danger-light)] text-[var(--sce-color-status-error)]",
        info:      "bg-[var(--sce-info-light)] text-[var(--sce-color-status-info)]",
        outline:   "border border-[var(--sce-color-border-strong)] bg-transparent text-[var(--sce-color-text-secondary)]",
      },
      size: {
        sm:      "h-5 px-2 text-[0.68rem]",
        default: "h-6 px-2.5 text-xs",
        lg:      "h-7 px-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size:    "default",
    },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;
export type BadgeSize    = NonNullable<VariantProps<typeof badgeVariants>["size"]>;

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

/**
 * Badge
 *
 * SportClubEvo Design System primitive.
 * Semantic pill label for statuses, categories, and counts.
 * Built with class-variance-authority — use `variant` and `size` props.
 *
 * Usage:
 *   <Badge variant="success">Active</Badge>
 *   <Badge variant="danger" size="sm">Overdue</Badge>
 *   <Badge variant="outline">Draft</Badge>
 */
export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}
