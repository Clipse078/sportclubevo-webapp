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
        "grid grid-cols-1 gap-5 lg:gap-6",
        sidebar &&
          "xl:grid-cols-[minmax(0,1fr)_minmax(300px,27%)] xl:items-start xl:gap-6",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-5 lg:gap-6">{children}</div>
      {sidebar && (
        <aside className="flex flex-col gap-4 border-t border-[var(--border)] pt-5 xl:min-w-[300px] xl:border-t-0 xl:border-l xl:border-[color-mix(in_srgb,var(--border)_80%,transparent)] xl:pl-6 xl:pt-0">
          {sidebar}
        </aside>
      )}
    </div>
  );
}
