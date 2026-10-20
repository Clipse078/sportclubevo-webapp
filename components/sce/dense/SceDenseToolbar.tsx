import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

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
      className={cn("space-y-3 border-b border-[var(--border)] p-4 md:p-5", className)}
    >
      {children}
      {footer}
    </div>
  );
}
