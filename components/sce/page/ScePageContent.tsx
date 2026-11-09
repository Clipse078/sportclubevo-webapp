import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ScePageWidthMode } from "@/lib/shell/sce-page-layout";
import { SCE_PAGE_SHELL_WIDTH_CLASS } from "@/lib/shell/sce-page-layout";

export type ScePageContentProps = {
  children: ReactNode;
  className?: string;
  widthMode?: ScePageWidthMode;
  testId?: string;
};

/**
 * Canonical bounded page content region — aligns with Finance workspace rhythm.
 */
export function ScePageContent({
  children,
  className,
  widthMode = "readable",
  testId = "sce-page-content",
}: ScePageContentProps) {
  return (
    <div
      className={cn("min-w-0 w-full", SCE_PAGE_SHELL_WIDTH_CLASS[widthMode], className)}
      data-sce-page-content
      data-testid={testId}
    >
      {children}
    </div>
  );
}
