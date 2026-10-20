import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SCE_TEXT_EXPANSION_SAFE_CLASS } from "@/lib/design-system/sce-responsive-accessibility-micro-ux";

export type SceDenseToolbarProps = {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  "data-testid"?: string;
};

/** Filter / search / primary action region for dense surfaces. */
export function SceDenseToolbar({
  children,
  className,
  footer,
  "data-testid": testId = "sce-dense-toolbar",
}: SceDenseToolbarProps) {
  return (
    <div
      data-sce-dense-toolbar="true"
      data-testid={testId}
      className={cn(
        SCE_TEXT_EXPANSION_SAFE_CLASS,
        "space-y-3 border-b border-[var(--border)] p-4 md:p-5",
        className,
      )}
    >
      {children}
      {footer}
    </div>
  );
}
