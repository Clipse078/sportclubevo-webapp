import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  buildPersonalInboxFilterHref,
  type PersonalInboxFilterParam,
} from "@/lib/personal-actions/aufgaben-scope";
import { SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS } from "@/lib/design-system/sce-form-control-micro-ux";

const FILTER_LABELS: Record<PersonalInboxFilterParam, string> = {
  all: "Alle",
  tasks: "Aufgaben",
  attendance: "Teilnahmen",
  requirements: "Anforderungen",
};

type Props = {
  filter: PersonalInboxFilterParam;
  basePath?: string;
};

/**
 * Secondary local filters inside Meine Aufgaben — visually subordinate to workspace context tabs.
 */
export default function PersonalInboxFilterNav({ filter, basePath = "/dashboard/aufgaben" }: Props) {
  const keys = Object.keys(FILTER_LABELS) as PersonalInboxFilterParam[];

  return (
    <div
      className="flex flex-col gap-1 sm:items-end"
      data-testid="personal-inbox-filter-rail"
      data-personal-inbox-filter-tier="secondary"
    >
      <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-[var(--muted)]">
        Inbox filtern
      </span>
      <div
        className="flex flex-wrap gap-1"
        role="radiogroup"
        aria-label="Persönliche Aufgaben filtern"
        data-testid="personal-inbox-filters"
      >
        {keys.map((key) => {
          const active = filter === key;
          return (
            <Link
              key={key}
              href={buildPersonalInboxFilterHref(key, basePath)}
              role="radio"
              aria-checked={active}
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
