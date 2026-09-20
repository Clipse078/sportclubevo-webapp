"use client";

import { ArrowDownUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { cn } from "@/lib/cn";
import {
  TASK_MANAGEMENT_SORT_LABELS,
  type TaskManagementSort,
} from "@/lib/tasks/management-navigation";

const SORT_OPTIONS: TaskManagementSort[] = [
  "DEADLINE_ASC",
  "PRIORITY_DESC",
  "UPDATED_DESC",
  "CREATED_DESC",
  "TITLE_ASC",
];

const CONTROL =
  "h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]";

type Props = {
  value: TaskManagementSort;
};

export default function AufgabenManagementSortControl({ value }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const onChange = useCallback(
    (nextSort: TaskManagementSort) => {
      const next = new URLSearchParams(searchParams.toString());
      if (nextSort === "DEADLINE_ASC") next.delete("sort");
      else next.set("sort", nextSort);
      next.delete("page");

      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, searchParams, startTransition],
  );

  return (
    <label className="relative inline-flex min-w-[10.5rem] items-center">
      <span className="sr-only">Sortierung</span>
      <ArrowDownUp
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
        aria-hidden="true"
      />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as TaskManagementSort)}
        className={cn(CONTROL, "w-full appearance-none pl-9 pr-8")}
        data-testid="aufgaben-sort-control"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {TASK_MANAGEMENT_SORT_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
