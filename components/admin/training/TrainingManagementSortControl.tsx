"use client";

import { ArrowDownUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { TrainingSeriesManagementSort } from "@/lib/training/management-series-view";
import { TRAINING_MANAGEMENT_SORT_LABELS } from "@/lib/training/management-presentation";
import { cn } from "@/lib/cn";

const CONTROL =
  "h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]";

const SORT_OPTIONS: TrainingSeriesManagementSort[] = [
  "TEAM_ASC",
  "UPDATED_DESC",
  "TITLE_ASC",
  "WEEKDAY",
  "START_TIME",
];

type Props = {
  value: TrainingSeriesManagementSort;
  archived?: boolean;
};

export default function TrainingManagementSortControl({ value, archived = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const onChange = useCallback(
    (nextSort: TrainingSeriesManagementSort) => {
      const next = new URLSearchParams(searchParams.toString());
      if (archived) next.set("archived", "1");
      if (nextSort === "TEAM_ASC") next.delete("seriesSort");
      else next.set("seriesSort", nextSort);
      next.delete("page");

      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [archived, pathname, router, searchParams, startTransition],
  );

  return (
    <label className="relative inline-flex min-w-[10.5rem] items-center">
      <span className="sr-only">Sortierung</span>
      <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as TrainingSeriesManagementSort)}
        className={cn(CONTROL, "w-full appearance-none pl-9 pr-8")}
        data-testid="training-sort-control"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {TRAINING_MANAGEMENT_SORT_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
