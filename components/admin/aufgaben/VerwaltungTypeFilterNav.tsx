import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  buildVerwaltungTypeFilterHref,
  type VerwaltungTypeFilterParam,
} from "@/lib/personal-actions/aufgaben-scope";
import { SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS } from "@/lib/design-system/sce-form-control-micro-ux";

const FILTER_LABELS: Record<VerwaltungTypeFilterParam, string> = {
  all: "Alle",
  tasks: "Aufgaben",
  requirements: "Anforderungen",
};

type Props = {
  filter: VerwaltungTypeFilterParam;
  basePath?: string;
  showTasks?: boolean;
  showRequirements?: boolean;
};

export default function VerwaltungTypeFilterNav({
  filter,
  basePath = "/dashboard/aufgaben",
  showTasks = true,
  showRequirements = true,
}: Props) {
  const keys = (Object.keys(FILTER_LABELS) as VerwaltungTypeFilterParam[]).filter((key) => {
    if (key === "tasks" && !showTasks) return false;
    if (key === "requirements" && !showRequirements) return false;
    if (key === "all" && !showTasks && showRequirements) return false;
    if (key === "all" && showTasks && !showRequirements) return false;
    return true;
  });

  if (keys.length <= 1) return null;

  return (
    <div
      className="flex flex-col gap-1 sm:items-start"
      data-testid="verwaltung-type-filter-rail"
      data-verwaltung-type-filter-tier="secondary"
    >
      <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-[var(--muted)]">
        Verwaltung filtern
      </span>
      <p className="max-w-lg text-[0.6875rem] text-[var(--text-2)]">
        «Alle» fasst Aufgaben und Anforderungen zusammen — Teilnahmen entstehen aus Aktivitäten.
      </p>
      <div
        className="flex flex-wrap gap-1"
        role="radiogroup"
        aria-label="Verwaltung nach Aktionstyp filtern"
        data-testid="verwaltung-type-filters"
      >
        {keys.map((key) => {
          const active = filter === key;
          return (
            <Link
              key={key}
              href={buildVerwaltungTypeFilterHref(key, basePath)}
              role="radio"
              aria-checked={active}
              data-testid={`verwaltung-type-filter-${key}`}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS,
                active
                  ? "border-[color-mix(in_srgb,var(--sce-accent)_45%,var(--border-strong))] bg-[color-mix(in_srgb,var(--sce-accent)_14%,var(--surface))] text-[var(--foreground)]"
                  : "border-[var(--border)] bg-[var(--surface)]/60 text-[var(--muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
              )}
            >
              {FILTER_LABELS[key]}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
