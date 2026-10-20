import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SCE_WORKSPACE_FEATURE_CARD_CLASS } from "@/lib/sce/workspace/sce-workspace-layout";

type Props = {
  children: ReactNode;
  className?: string;
  /** `panel` = elevated working surface; `flat` = section grouping without extra elevation. */
  variant?: "panel" | "flat";
  testId?: string;
};

/**
 * DS-04 — composable information panel shell (dark/navy SCE surface language).
 * Pair with domain-specific hierarchy content; not a universal card with flags.
 */
export function SceInformationSurface({
  children,
  className,
  variant = "panel",
  testId,
}: Props) {
  return (
    <section
      className={cn(
        variant === "panel" && SCE_WORKSPACE_FEATURE_CARD_CLASS,
        variant === "flat" && "min-w-0",
        className,
      )}
      data-sce-card-family="information-panel"
      data-testid={testId}
    >
      {children}
    </section>
  );
}
