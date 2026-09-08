import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { DashboardEmptyState } from "./DashboardEmptyState";

export type DashboardTaskListItem = {
  key: string;
  title: string;
  subtitle: string;
  href: string;
  accent?: "warning" | "info" | "success" | "primary";
};

const ACCENT_COLORS: Record<
  NonNullable<DashboardTaskListItem["accent"]>,
  string
> = {
  warning: "var(--sce-warning)",
  info: "var(--sce-info)",
  success: "var(--sce-success)",
  primary: "var(--sce-primary)",
};

export type DashboardTaskListProps = {
  tasks: DashboardTaskListItem[];
  className?: string;
};

export function DashboardTaskList({ tasks, className }: DashboardTaskListProps) {
  if (tasks.length === 0) {
    return (
      <DashboardEmptyState
        title="Alles im Blick"
        description="Aktuell gibt es hier nichts zu bearbeiten."
        className={cn("py-10", className)}
      />
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {tasks.map((task, idx) => {
        const isLast = idx === tasks.length - 1;
        const accentColor = ACCENT_COLORS[task.accent ?? "primary"];

        return (
          <Link
            key={task.key}
            href={task.href}
            className={cn(
              "group flex items-start gap-3 py-3 no-underline",
              "transition-colors duration-[120ms] hover:bg-[var(--surface-2)] -mx-2 px-2 rounded-lg",
              !isLast && "border-b border-[var(--border)]",
            )}
          >
            <div
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ background: accentColor }}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[0.8125rem] font-medium leading-tight text-[var(--foreground)]">
                {task.title}
              </p>
              <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                {task.subtitle}
              </p>
            </div>
            <ChevronRight
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)] opacity-0 transition-[opacity,transform] duration-[120ms] group-hover:translate-x-0.5 group-hover:opacity-100"
              aria-hidden="true"
            />
          </Link>
        );
      })}
    </div>
  );
}
