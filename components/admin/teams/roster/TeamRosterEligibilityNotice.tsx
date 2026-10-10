"use client";

import Link from "next/link";
import type { RosterEligibilityPresentation } from "@/lib/teams/roster-eligibility-presentation";

type Props = {
  presentation: RosterEligibilityPresentation;
};

const toneClass: Record<RosterEligibilityPresentation["tone"], string> = {
  warning:
    "rounded-lg border border-[var(--sce-warning-border)] bg-[var(--sce-warning-bg)] px-3 py-3 text-sm text-[var(--foreground)]",
  danger:
    "rounded-lg border border-[var(--sce-danger-border)] bg-[var(--sce-danger-bg)]/20 px-3 py-3 text-sm text-[var(--foreground)]",
};

export default function TeamRosterEligibilityNotice({ presentation }: Props) {
  return (
    <div
      className={toneClass[presentation.tone]}
      data-testid="team-roster-eligibility-notice"
      role="alert"
    >
      <p className="font-medium">{presentation.title}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{presentation.body}</p>
      {presentation.allowedBirthYearsLabel ? (
        <p className="mt-2 text-xs text-[var(--text-2)]">
          Erlaubte Jahrgänge: {presentation.allowedBirthYearsLabel}
        </p>
      ) : null}
      {presentation.showPersonBirthDateCta && presentation.personEditHref ? (
        <Link
          href={presentation.personEditHref}
          className="mt-3 inline-flex items-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
          data-testid="team-roster-eligibility-person-edit-cta"
        >
          Geburtsdatum in Stammdaten ergänzen
        </Link>
      ) : null}
    </div>
  );
}
