import Link from "next/link";
import { cn } from "@/lib/cn";
import { DashboardEmptyState } from "./DashboardEmptyState";
import type { AttentionItem } from "@/lib/dashboard/command-center";

export type DashboardAttentionListProps = {
  items: AttentionItem[];
  className?: string;
};

function AttentionRow({ item }: { item: AttentionItem }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-start gap-3 border-b border-[var(--border)] py-3 no-underline last:border-b-0",
        "transition-colors duration-[120ms] hover:bg-[var(--surface-2)] -mx-2 px-2 rounded-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
      )}
    >
      <span
        className={cn(
          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
          item.urgent ? "bg-[var(--sce-primary)]" : "bg-[var(--border-strong)]",
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-medium leading-snug text-[var(--foreground)] group-hover:text-[var(--foreground)]">
          {item.title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">
          {item.subtitle}
        </p>
      </div>
    </Link>
  );
}

export function DashboardAttentionList({ items, className }: DashboardAttentionListProps) {
  if (items.length === 0) {
    return (
      <DashboardEmptyState
        className={cn("py-6", className)}
        title="Alles im grünen Bereich"
        description="Es gibt derzeit keine offenen operativen Punkte, die deine Aufmerksamkeit brauchen."
      />
    );
  }

  return (
    <div className={className} role="list" aria-label="Benötigt Aufmerksamkeit">
      {items.map((item) => (
        <AttentionRow key={item.key} item={item} />
      ))}
    </div>
  );
}
