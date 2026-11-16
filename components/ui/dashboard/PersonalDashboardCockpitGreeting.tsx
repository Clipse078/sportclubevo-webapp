import { cn } from "@/lib/cn";
import { DashboardCompactWelcome } from "./DashboardCompactWelcome";

export type PersonalDashboardCockpitGreetingProps = {
  greeting: string;
  highlightName?: string;
  contextLine: string;
  introLine?: string;
  initialBackgroundImageUrl?: string | null;
  initialBackgroundTransform?: import("@/lib/dashboard/dashboard-hero-position").HeroImageTransform;
  className?: string;
};

/**
 * Contextual typography over the canonical app background — no hero photograph card.
 * SCE-DS2-05B-R4 — dashboard customize control removed from the greeting header.
 */
export function PersonalDashboardCockpitGreeting({
  greeting,
  highlightName,
  contextLine,
  introLine,
  className,
}: PersonalDashboardCockpitGreetingProps) {
  return (
    <header
      className={cn("min-w-0 space-y-1 px-0 py-0.5", className)}
      data-testid="personal-dashboard-greeting"
    >
      <DashboardCompactWelcome greeting={greeting} highlightName={highlightName} />
      {introLine ? (
        <p className="text-sm text-[var(--muted)] max-w-3xl">{introLine}</p>
      ) : null}
      {contextLine ? (
        <p className="text-[0.8125rem] font-medium leading-snug text-[var(--text-2)]">
          {contextLine}
        </p>
      ) : null}
    </header>
  );
}
