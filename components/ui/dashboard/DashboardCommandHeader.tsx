import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DashboardWelcome } from "./DashboardWelcome";

export type DashboardCommandHeaderProps = {
  greeting: string;
  /** Supporting welcome line below the greeting. */
  subtitle?: string;
  clubName?: string;
  activeSeason?: string;
  date?: string;
  actions?: ReactNode;
  className?: string;
};

/**
 * Compact operational command header — no marketing hero.
 */
export function DashboardCommandHeader({
  greeting,
  subtitle,
  clubName,
  activeSeason,
  date,
  actions,
  className,
}: DashboardCommandHeaderProps) {
  const contextChips = [
    clubName,
    activeSeason ? `Saison ${activeSeason}` : null,
    date,
  ].filter(Boolean);

  const welcomeSubtitle =
    subtitle ??
    (clubName
      ? "Dein Überblick für den heutigen Vereinsbetrieb."
      : undefined);

  return (
    <header
      className={cn(
        "flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between",
        className,
      )}
    >
      <DashboardWelcome greeting={greeting} subtitle={welcomeSubtitle} />

      <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:pt-1">
        {contextChips.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[0.6875rem] font-medium text-[var(--text-2)]"
          >
            {chip}
          </span>
        ))}
        {actions}
      </div>
    </header>
  );
}
