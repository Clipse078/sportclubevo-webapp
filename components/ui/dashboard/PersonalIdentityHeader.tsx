import { cn } from "@/lib/cn";
import { DashboardCompactWelcome } from "./DashboardCompactWelcome";

export type PersonalIdentityHeaderProps = {
  greeting: string;
  highlightName?: string;
  subtitle: string;
  /** Club · season · date — integrated context line. */
  contextLine: string;
  backgroundImageUrl?: string | null;
  tenantCrestUrl?: string | null;
  className?: string;
};

/**
 * Compact premium personal identity strip — emotional club imagery without marketing-hero scale.
 */
export function PersonalIdentityHeader({
  greeting,
  highlightName,
  subtitle,
  contextLine,
  backgroundImageUrl,
  tenantCrestUrl,
  className,
}: PersonalIdentityHeaderProps) {
  const hasPhoto = Boolean(backgroundImageUrl?.trim());

  return (
    <header
      className={cn(
        "relative isolate overflow-hidden rounded-[var(--radius-xl)]",
        "border border-[color-mix(in_srgb,var(--border)_35%,transparent)]",
        "min-h-[11rem] max-h-[15rem] h-[clamp(11rem,16vw,15rem)]",
        className,
      )}
      data-testid="personal-identity-header"
    >
      {hasPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- canonical persisted hero / tenant media URL from server.
        <img
          src={backgroundImageUrl!}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : (
        <>
          <div
            className="absolute inset-0 bg-[linear-gradient(118deg,color-mix(in_srgb,var(--background)_92%,var(--sce-primary)_8%)_0%,var(--background)_40%,color-mix(in_srgb,var(--surface)_70%,var(--background)_30%)_100%)]"
            aria-hidden
          />
          {tenantCrestUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenantCrestUrl}
              alt=""
              aria-hidden
              className="pointer-events-none absolute -right-2 top-1/2 h-[4.5rem] w-[4.5rem] -translate-y-1/2 object-contain opacity-[0.22] sm:h-[5.5rem] sm:w-[5.5rem]"
            />
          ) : null}
        </>
      )}

      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          hasPhoto
            ? "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--background)_15%,transparent)_0%,color-mix(in_srgb,var(--background)_55%,transparent)_42%,var(--background)_92%)]"
            : "bg-[linear-gradient(180deg,transparent_0%,color-mix(in_srgb,var(--background)_35%,transparent)_100%)]",
        )}
        aria-hidden
      />

      <div className="relative flex h-full flex-col justify-end px-4 py-3.5 sm:px-6 sm:py-4">
        <DashboardCompactWelcome
          greeting={greeting}
          highlightName={highlightName}
          className="text-[var(--foreground)] drop-shadow-sm"
        />
        <p className="mt-0.5 max-w-3xl text-[0.8125rem] leading-snug text-[var(--text-2)]">{subtitle}</p>
        {contextLine ? (
          <p className="mt-1.5 text-[0.8125rem] font-medium leading-snug text-[var(--foreground)]/90">
            {contextLine}
          </p>
        ) : null}
      </div>
    </header>
  );
}
