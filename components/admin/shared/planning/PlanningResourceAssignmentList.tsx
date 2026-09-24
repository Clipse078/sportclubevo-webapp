"use client";

/**
 * PLANNING-UX-07R4 — vertical list of assignment rows with consistent spacing.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PlanningResourceAssignmentListProps = {
  children: ReactNode;
  testId?: string;
  className?: string;
};

export function PlanningResourceAssignmentList({
  children,
  testId,
  className,
}: PlanningResourceAssignmentListProps) {
  return (
    <div
      className={cn("divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]", className)}
      data-testid={testId}
    >
      <div className="divide-y divide-[var(--border)] [&>div]:px-3 [&>div]:py-2.5">{children}</div>
    </div>
  );
}
