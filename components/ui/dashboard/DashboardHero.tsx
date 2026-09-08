import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DashboardWelcome } from "./DashboardWelcome";

export type DashboardHeroProps = {
  greeting: string;
  subtitle?: string;
  clubName?: string;
  activeSeason?: string;
  role?: string;
  date?: string;
  actions?: ReactNode;
  className?: string;
};

export function DashboardHero({
  greeting,
  subtitle = "Hier ist der aktuelle Überblick für euren Vereinsbetrieb.",
  clubName,
  activeSeason,
  role,
  date,
  actions,
  className,
}: DashboardHeroProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-5",
        className,
      )}
    >
      {/* Subtle atmospheric glow — tenant-orange influence */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background: [
            "radial-gradient(ellipse 80% 60% at 0% 0%, color-mix(in srgb, var(--sce-primary) 6%, transparent), transparent 70%)",
            "linear-gradient(135deg, color-mix(in srgb, var(--sce-primary) 3%, transparent) 0%, transparent 50%)",
          ].join(", "),
        }}
      />

      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Übersicht
          </p>
          <DashboardWelcome
            greeting={greeting}
            subtitle={subtitle}
            className="mt-2 gap-1.5"
          />
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
          {clubName && (
            <p className="text-sm font-medium text-[var(--foreground)]">{clubName}</p>
          )}
          {activeSeason && (
            <p className="text-[0.8125rem] text-[var(--text-2)]">Saison {activeSeason}</p>
          )}
          {date && (
            <p className="text-[0.8125rem] text-[var(--muted)]">{date}</p>
          )}
          {role && (
            <p className="text-[0.75rem] text-[var(--muted)]">{role}</p>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}
