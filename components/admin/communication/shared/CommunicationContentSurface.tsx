import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SCE_DENSITY_WORKSPACE_CONTENT_PADDING_CLASS } from "@/lib/design-system/sce-density-border-micro-ux";
import { SCE_SURFACE_STANDARD_PANEL } from "@/lib/shell/sce-surface-system";

type CommunicationContentSurfaceProps = {
  children: ReactNode;
  className?: string;
  /** When false, children render without the elevated panel (e.g. multi-card layouts). */
  padded?: boolean;
};

/**
 * Readable working surface for Communication pages — separates operational UI
 * from the authenticated decorative shell (SCE-COMM-UX-01).
 */
export function CommunicationContentSurface({
  children,
  className,
  padded = true,
}: CommunicationContentSurfaceProps) {
  return (
    <div
      className={cn(
        SCE_SURFACE_STANDARD_PANEL,
        padded && SCE_DENSITY_WORKSPACE_CONTENT_PADDING_CLASS,
        className,
      )}
    >
      {children}
    </div>
  );
}
