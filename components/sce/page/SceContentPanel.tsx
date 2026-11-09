import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SCE_FUNCTIONAL_PANEL_CLASS } from "@/lib/design-system/sce-functional-surface-styles";

export type SceContentPanelProps = {
  children: ReactNode;
  className?: string;
  padding?: "standard" | "none";
  testId?: string;
};

/** White-first functional panel — shared card/panel surface from Finance modules. */
export function SceContentPanel({
  children,
  className,
  padding = "standard",
  testId = "sce-content-panel",
}: SceContentPanelProps) {
  return (
    <section
      className={cn(
        SCE_FUNCTIONAL_PANEL_CLASS,
        padding === "standard" && "p-4 sm:p-5",
        className,
      )}
      data-sce-content-panel
      data-testid={testId}
    >
      {children}
    </section>
  );
}
