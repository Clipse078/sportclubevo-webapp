import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SCE_SURFACE_STANDARD_PANEL } from "@/lib/shell/sce-surface-system";

export type SceDenseSurfaceProps = {
  children: ReactNode;
  className?: string;
  /** DS-07 feedback surface id — empty/loading/error share this region. */
  feedbackSurfaceId?: string;
  "aria-label"?: string;
  "data-testid"?: string;
};

/**
 * Canonical bounded dense-information surface (toolbar + header + rows + states).
 * Not card soup — rows belong to one operational panel.
 */
export function SceDenseSurface({
  children,
  className,
  feedbackSurfaceId,
  "aria-label": ariaLabel,
  "data-testid": testId = "sce-dense-surface",
}: SceDenseSurfaceProps) {
  return (
    <section
      data-sce-dense-surface="true"
      data-sce-feedback-surface={feedbackSurfaceId}
      data-testid={testId}
      aria-label={ariaLabel}
      className={cn(SCE_SURFACE_STANDARD_PANEL, "overflow-hidden p-0", className)}
    >
      {children}
    </section>
  );
}
