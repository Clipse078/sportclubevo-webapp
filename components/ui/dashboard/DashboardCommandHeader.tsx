import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DashboardWelcome } from "./DashboardWelcome";

export type DashboardCommandHeaderProps = {
  greeting: string;
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
  clubName,
  activeSeason,
  date,
  actions,
  className,
}: DashboardCommandHeaderProps) {
  const contextParts = [
    clubName,
    activeSeason ? `Saison ${activeSeason}` : null,
    date,
  ].filter(Boolean);

  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-5",
        className,
      )}
    >
      <DashboardWelcome greeting={greeting} />

      <div className="flex flex-wrap items-center gap-3">
        {contextParts.length > 0 && (
          <p className="text-[0.8125rem] leading-relaxed text-[var(--muted)]">
            {contextParts.join(" · ")}
          </p>
        )}
        {actions}
      </div>
    </header>
  );
}
