import { cn } from "@/lib/cn";
import { DashboardCompactWelcome } from "./DashboardCompactWelcome";

export type PersonalDashboardCockpitGreetingProps = {
  greeting: string;
  highlightName?: string;
  contextLine: string;
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
  className,
}: PersonalDashboardCockpitGreetingProps) {
  return (
    <header
      className={cn("min-w-0 px-0 py-0.5", className)}
      data-testid="personal-dashboard-greeting"
    >
      <DashboardCompactWelcome greeting={greeting} highlightName={highlightName} />
      {contextLine ? (
        <p className="mt-0.5 text-[0.8125rem] font-medium leading-snug text-[var(--text-2)]">
          {contextLine}
        </p>
      ) : null}
    </header>
  );
}
