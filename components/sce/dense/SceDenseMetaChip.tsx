import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SceDenseMetaChipProps = {
  label: string;
  className?: string;
  icon?: ReactNode;
  title?: string;
  testId?: string;
};

/** Restrained dense meta label — text always visible; colour is additive only. */
export function SceDenseMetaChip({
  label,
  className,
  icon,
  title,
  testId,
}: SceDenseMetaChipProps) {
  return (
    <span
      title={title}
      data-testid={testId}
      data-sce-dense-meta-chip="true"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5",
        "text-[0.625rem] font-semibold uppercase tracking-wide leading-none",
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}
