import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SCE_DENSE_HEADER_ROW_CLASS } from "@/lib/design-system/sce-dense-ui-micro-ux";

export type SceDenseGridHeaderProps = {
  children: ReactNode;
  gridClassName: string;
  className?: string;
  "data-testid"?: string;
};

export function SceDenseGridHeader({
  children,
  gridClassName,
  className,
  "data-testid": testId = "sce-dense-grid-header",
}: SceDenseGridHeaderProps) {
  return (
    <div
      role="row"
      data-sce-dense-grid-header="true"
      data-testid={testId}
      className={cn(
        "hidden md:grid md:gap-3",
        SCE_DENSE_HEADER_ROW_CLASS,
        gridClassName,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SceDenseGridHeaderCell({
  children,
  className,
  align,
}: {
  children: ReactNode;
  className?: string;
  align?: "start" | "end";
}) {
  return (
    <span
      role="columnheader"
      className={cn(align === "end" && "text-right", className)}
    >
      {children}
    </span>
  );
}
