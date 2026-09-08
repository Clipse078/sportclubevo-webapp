import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DashboardGridProps = {
  children: ReactNode;
  sidebar?: ReactNode;
  className?: string;
};

export function DashboardGrid({
  children,
  sidebar,
  className,
}: DashboardGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 lg:gap-7",
        sidebar && "xl:grid-cols-[minmax(0,1fr)_minmax(300px,28%)] xl:gap-8",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-6 lg:gap-7">{children}</div>
      {sidebar && (
        <aside className="flex flex-col gap-5 border-t border-[var(--border)] pt-6 xl:min-w-[300px] xl:border-t-0 xl:border-l xl:pl-7 xl:pt-0">
          {sidebar}
        </aside>
      )}
    </div>
  );
}
