import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonVariants, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export type SceActionLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Marks action hierarchy for DS-06 guardrails. */
  "data-sce-action-hierarchy"?: "PRIMARY" | "SECONDARY" | "TERTIARY_TEXT";
};

/**
 * Navigation action styled with canonical Button variants — use for workspace primary/secondary CTAs.
 */
export function SceActionLink({
  className,
  variant = "primary",
  size = "default",
  "data-sce-action-hierarchy": hierarchy,
  ...props
}: SceActionLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), "no-underline", className)}
      data-sce-action-link
      data-sce-action-hierarchy={hierarchy}
      {...props}
    />
  );
}
