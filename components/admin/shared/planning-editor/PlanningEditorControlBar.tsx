"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  testId?: string;
  className?: string;
};

/**
 * Operational controls (publication, status actions, Zeitstandard access) — always near the top
 * of a planning workspace, directly under the record header.
 */
export default function PlanningEditorControlBar({
  children,
  testId = "planning-editor-control-bar",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-[var(--border)]/80 bg-[var(--surface)]/70 p-3 sm:p-4",
        className,
      )}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
