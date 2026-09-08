import Link from "next/link";
import {
  Bell,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Newspaper,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { DashboardEmptyState } from "./DashboardEmptyState";
import type { AttentionItem } from "@/lib/dashboard/command-center";

export type DashboardAttentionListProps = {
  items: AttentionItem[];
  className?: string;
};

const ATTENTION_ICON_BY_KEY: Record<
  string,
  { icon: typeof ClipboardList; accent: string; bg: string }
> = {
  registrations: {
    icon: ClipboardList,
    accent: "var(--sce-warning)",
    bg: "var(--sce-warning-light)",
  },
  "news-review": {
    icon: Newspaper,
    accent: "var(--sce-info)",
    bg: "var(--sce-info-light)",
  },
  "scheduled-news": {
    icon: CalendarClock,
    accent: "var(--sce-primary)",
    bg: "var(--sce-primary-light)",
  },
  "overdue-actions": {
    icon: Bell,
    accent: "var(--sce-danger)",
    bg: "var(--sce-danger-light)",
  },
};

function AttentionRow({ item }: { item: AttentionItem }) {
  const iconConfig = ATTENTION_ICON_BY_KEY[item.key] ?? {
    icon: Bell,
    accent: "var(--sce-primary)",
    bg: "var(--sce-primary-light)",
  };
  const Icon = iconConfig.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-start gap-3 border-b border-[color-mix(in_srgb,var(--border)_85%,transparent)] py-3 no-underline last:border-b-0",
        "motion-safe:transition-colors motion-safe:duration-150 motion-safe:hover:bg-[var(--surface-2)] -mx-1.5 rounded-md px-1.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
      )}
    >
      <span
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
        style={{ backgroundColor: iconConfig.bg, color: iconConfig.accent }}
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-semibold leading-snug text-[var(--foreground)]">
          {item.title}
        </p>
        <p className="mt-0.5 text-[0.75rem] leading-relaxed text-[var(--muted)]">
          {item.subtitle}
        </p>
      </div>
      <ChevronRight
        className="mt-2 h-4 w-4 shrink-0 text-[var(--muted)] motion-safe:transition-colors motion-safe:duration-150 group-hover:text-[var(--sce-primary)]"
        aria-hidden="true"
      />
    </Link>
  );
}

export function DashboardAttentionList({ items, className }: DashboardAttentionListProps) {
  if (items.length === 0) {
    return (
      <DashboardEmptyState
        className={cn("py-4", className)}
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
