import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DashboardWelcome } from "./DashboardWelcome";

export type DashboardHeroProps = {
  greeting: string;
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
  subtitle = "Schön, dass du wieder da bist.",
  clubName,
  activeSeason,
  date,
  backgroundImageUrl,
  kpiGrid,
  actions,
  className,
}: DashboardHeroProps) {
  const contextLines = [
    clubName,
    activeSeason ? `Saison ${activeSeason}` : null,
    date,
  ].filter(Boolean);

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)]",
        "shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      {/* Optional real background image */}
      {backgroundImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- tenant/user dashboard background URL resolved on server.
        <img
          src={backgroundImageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Layer stack: navy overlay → readability gradients → bottom fade */}
      <div
        className={cn(
          "absolute inset-0",
          backgroundImageUrl
            ? "bg-[color-mix(in_srgb,var(--background)_72%,transparent)]"
            : "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--background)_98%,var(--sce-primary)_2%)_0%,var(--background)_45%,color-mix(in_srgb,var(--surface)_88%,var(--background)_12%)_100%)]",
        )}
        aria-hidden="true"
      />
      {backgroundImageUrl && (
        <>
          <div
            className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--background)_88%,transparent)_0%,transparent_55%,color-mix(in_srgb,var(--background)_75%,transparent)_100%)]"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent_0%,var(--background)_92%)]"
            aria-hidden="true"
          />
        </>
      )}
      {!backgroundImageUrl && (
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[color-mix(in_srgb,var(--sce-primary)_8%,transparent)] blur-3xl"
          aria-hidden="true"
        />
      )}

      <div className="relative px-5 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <DashboardWelcome greeting={greeting} subtitle={subtitle} showEyebrow />

          <div className="flex flex-col items-start gap-2 lg:items-end lg:pt-1">
            {contextLines.length > 0 && (
              <div className="text-right text-[0.8125rem] leading-relaxed text-[var(--text-2)]">
                {contextLines.map((line, index) => (
                  <p
                    key={line}
                    className={cn(
                      index === 0 && "font-semibold text-[var(--foreground)]",
                    )}
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}
            {actions}
          </div>
        </div>

        {kpiGrid && <div className="mt-6 lg:mt-7">{kpiGrid}</div>}
      </div>
    </section>
  );
}
