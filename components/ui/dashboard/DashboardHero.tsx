import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DashboardWelcome } from "./DashboardWelcome";

export type DashboardHeroProps = {
  greeting: string;
  highlightName?: string;
  subtitle?: string;
  clubName?: string;
  activeSeason?: string;
  date?: string;
  /** Serializable optional personal dashboard background — V3-03 ready. */
  backgroundImageUrl?: string | null;
  kpiGrid?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/**
 * Premium command-center hero — greeting, context, and KPIs in one composed region.
 */
export function DashboardHero({
  greeting,
  highlightName,
  subtitle = "Schön, dass du wieder da bist.",
  clubName,
  activeSeason,
  date,
  backgroundImageUrl,
  kpiGrid,
  actions,
  className,
}: DashboardHeroProps) {
  const clubSeasonLine = [clubName, activeSeason ? `Saison ${activeSeason}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-xl)]",
        "border border-[color-mix(in_srgb,var(--border)_30%,transparent)]",
        "shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]",
        "lg:min-h-[15.625rem]",
        className,
      )}
    >
      {backgroundImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- tenant/user dashboard background URL resolved on server.
        <img
          src={backgroundImageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      )}

      <div
        className={cn(
          "absolute inset-0",
          backgroundImageUrl
            ? "bg-[color-mix(in_srgb,var(--background)_76%,transparent)]"
            : "bg-[linear-gradient(118deg,color-mix(in_srgb,var(--background)_94%,var(--sce-primary)_6%)_0%,var(--background)_32%,color-mix(in_srgb,var(--surface)_78%,var(--background)_22%)_68%,color-mix(in_srgb,var(--background)_88%,var(--surface)_12%)_100%)]",
        )}
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_8%_12%,color-mix(in_srgb,var(--sce-primary)_12%,transparent)_0%,transparent_58%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--foreground)_4%,transparent)_0%,transparent_38%,color-mix(in_srgb,var(--background)_62%,transparent)_100%)]"
        aria-hidden="true"
      />

      {backgroundImageUrl && (
        <>
          <div
            className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--background)_92%,transparent)_0%,transparent_48%,color-mix(in_srgb,var(--background)_84%,transparent)_100%)]"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent_0%,var(--background)_96%)]"
            aria-hidden="true"
          />
        </>
      )}

      {!backgroundImageUrl && (
        <>
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[color-mix(in_srgb,var(--sce-primary)_9%,transparent)] blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-[linear-gradient(180deg,transparent_0%,color-mix(in_srgb,var(--background)_40%,transparent)_100%)]"
            aria-hidden="true"
          />
        </>
      )}

      <div className="relative flex min-h-[15.625rem] flex-col px-5 py-5 sm:px-6 lg:px-7 lg:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <DashboardWelcome
            greeting={greeting}
            highlightName={highlightName}
            subtitle={subtitle}
            showEyebrow
          />

          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end sm:text-right lg:pt-0.5">
            {clubSeasonLine && (
              <p className="text-[0.8125rem] font-semibold leading-snug text-[var(--foreground)]">
                {clubSeasonLine}
              </p>
            )}
            {date && (
              <p className="text-[0.8125rem] leading-snug text-[var(--text-2)]">{date}</p>
            )}
            {actions}
          </div>
        </div>

        {kpiGrid && <div className="mt-auto pt-4 lg:pt-5">{kpiGrid}</div>}
      </div>
    </section>
  );
}
