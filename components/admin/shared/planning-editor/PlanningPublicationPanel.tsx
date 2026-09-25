"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  testId?: string;
  className?: string;
  headingId?: string;
  /** When false, only the heading is shown (domain body supplies scope copy). */
  showIntro?: boolean;
};

/**
 * PLANNING-UX-06 — compact right-rail / secondary-column publication shell.
 * Business logic and toggles live in PlanningEditorPublicationControls (or domain wrappers).
 */
export default function PlanningPublicationPanel({
  children,
  testId = "planning-publication-panel",
  className,
  headingId = "planning-publication-panel-heading",
  showIntro = true,
}: Props) {
  const t = useTranslations("PlanningEditor.operational.publication");

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--border)]/80 bg-[var(--surface)]/70",
        className,
      )}
      aria-labelledby={headingId}
      data-testid={testId}
    >
      <div className="border-b border-[var(--border)]/80 px-3 py-2.5 md:px-4">
        <h2 id={headingId} className="text-sm font-semibold text-[var(--foreground)]">
          {t("heading")}
        </h2>
        {showIntro ? (
          <p className="mt-0.5 text-xs text-[var(--muted)]">{t("intro")}</p>
        ) : null}
      </div>
      <div className="min-w-0 p-0">{children}</div>
    </section>
  );
}
