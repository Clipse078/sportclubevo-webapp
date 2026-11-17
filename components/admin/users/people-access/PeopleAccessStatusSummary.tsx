"use client";

import { cn } from "@/lib/cn";

type StatusFilter = "all" | "active" | "deactivated" | "pending" | "not_invited" | "privileged";

type Props = {
  activeCount: number;
  pendingCount: number;
  inactiveCount: number;
  noAccountCount: number;
  privilegedCount: number;
  showPrivileged: boolean;
  statusFilter: StatusFilter;
  onStatusFilter: (next: StatusFilter) => void;
};

/**
 * Compact status summary — replaces five large KPI cards.
 */
export default function PeopleAccessStatusSummary({
  activeCount,
  pendingCount,
  inactiveCount,
  noAccountCount,
  privilegedCount,
  showPrivileged,
  statusFilter,
  onStatusFilter,
}: Props) {
  const items: Array<{ key: StatusFilter; label: string; value: number; hint: string }> = [
    { key: "active", label: "Konten aktiv", value: activeCount, hint: "Login + Mitgliedschaft" },
    { key: "pending", label: "Einladungen", value: pendingCount, hint: "ausstehend" },
    { key: "deactivated", label: "Deaktiviert", value: inactiveCount, hint: "ohne Login" },
    { key: "not_invited", label: "Ohne Konto", value: noAccountCount, hint: "nur Person" },
  ];
  if (showPrivileged) {
    items.push({
      key: "privileged",
      label: "Privilegiert",
      value: privilegedCount,
      hint: "erweiterte Rechte",
    });
  }

  return (
    <div
      className="flex flex-wrap items-stretch gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 shadow-sm"
      data-testid="people-access-status-summary"
    >
      {items.map((item) => {
        const active = statusFilter === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onStatusFilter(active ? "all" : item.key)}
            className={cn(
              "min-w-[7rem] flex-1 rounded-lg border px-2.5 py-1.5 text-left transition",
              active
                ? "border-[var(--blue)]/40 bg-[var(--surface-2)]"
                : "border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-2)]/50",
            )}
            aria-pressed={active}
          >
            <span className="block text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {item.label}
            </span>
            <span className="block text-lg font-semibold tabular-nums text-[var(--foreground)]">
              {item.value}
            </span>
            <span className="block text-[0.65rem] text-[var(--muted)]">{item.hint}</span>
          </button>
        );
      })}
      {statusFilter !== "all" ? (
        <button
          type="button"
          className="self-center text-xs font-medium text-[var(--blue,#2563EB)]"
          onClick={() => onStatusFilter("all")}
        >
          Filter aufheben
        </button>
      ) : null}
    </div>
  );
}