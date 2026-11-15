"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import { cn } from "@/lib/cn";

type Props = {
  taskId: string;
  title: string;
  className?: string;
};

export default function SprintTaskTitleLink({ taskId, title, className }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnTo = query ? `${pathname}?${query}` : pathname;

  return (
    <Link
      href={taskWorkspaceHref(taskId, { returnTo })}
      className={cn(
        "rounded-sm text-sm font-semibold text-[var(--foreground)] hover:text-[var(--sce-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--sce-primary)_55%,transparent)]",
        className,
      )}
      data-testid="sprint-task-title-link"
    >
      {title}
    </Link>
  );
}