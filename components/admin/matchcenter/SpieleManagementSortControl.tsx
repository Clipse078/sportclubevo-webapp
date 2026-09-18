"use client";

import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { SpieleManagementSort } from "@/lib/matchcenter/management-view";
import { cn } from "@/lib/cn";

type Props = {
  value: SpieleManagementSort;
  tab: "SPIELPLANUNG" | "RESULTATE";
};

const CONTROL =
  "h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]";

export default function SpieleManagementSortControl({ value, tab }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function onChange(next: SpieleManagementSort) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === (tab === "RESULTATE" ? "KICKOFF_DESC" : "KICKOFF_ASC")) {
      params.delete("sort");
    } else {
      params.set("sort", next.toLowerCase());
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">Sortierung</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SpieleManagementSort)}
        className={cn(CONTROL, "min-w-[9.5rem] appearance-none pl-3 pr-8")}
        data-testid="spiele-sort-control"
      >
        <option value="KICKOFF_ASC">Datum aufsteigend</option>
        <option value="KICKOFF_DESC">Datum absteigend</option>
      </select>
      {value === "KICKOFF_DESC" ? (
        <ArrowDownAZ className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
      ) : (
        <ArrowUpAZ className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
      )}
    </label>
  );
}
