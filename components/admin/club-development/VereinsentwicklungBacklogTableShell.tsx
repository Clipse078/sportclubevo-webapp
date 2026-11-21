import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  header: ReactNode;
  children: ReactNode;
  gridClassName: string;
  testId?: string;
  className?: string;
};

export default function VereinsentwicklungBacklogTableShell({
  header,
  children,
  gridClassName,
  testId,
  className,
}: Props) {
  return (
    <div data-testid={testId} className={cn("min-w-0", className)}>
      <div
        className={cn(
          "mb-1 hidden gap-3 border-b border-[var(--border)]/60 px-0 pb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)] sm:grid",
          gridClassName,
        )}
        data-testid={testId ? `${testId}-header` : undefined}
      >
        {header}
      </div>
      <div className="divide-y divide-[var(--border)]/55" data-testid={testId ? `${testId}-body` : undefined}>
        {children}
      </div>
    </div>
  );
}