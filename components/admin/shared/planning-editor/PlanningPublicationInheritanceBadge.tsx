"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  testId?: string;
};

/** Compact badge for team/series-level publication effective state. */
export default function PlanningPublicationInheritanceBadge({
  className,
  testId = "planning-publication-inheritance-badge",
}: Props) {
  const t = useTranslations("PlanningEditor.operational.publication");

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)]/80 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--muted)]",
        className,
      )}
      data-testid={testId}
    >
      {t("teamSeasonScopeBadge")}
    </span>
  );
}
