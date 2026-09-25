import { cn } from "@/lib/cn";
import { DashboardCompactWelcome } from "./DashboardCompactWelcome";
import { PersonalDashboardCustomizeDialog } from "./PersonalDashboardCustomizeDialog";
import type { HeroImageTransform } from "@/lib/dashboard/dashboard-hero-position";

export type PersonalDashboardCockpitGreetingProps = {
  greeting: string;
  highlightName?: string;
  contextLine: string;
  initialBackgroundImageUrl?: string | null;
  initialBackgroundTransform?: HeroImageTransform;
  className?: string;
};

/**
 * Contextual typography over the canonical app background — no hero photograph card.
 */
export function PersonalDashboardCockpitGreeting({
  greeting,
  highlightName,
  contextLine,
  initialBackgroundImageUrl,
  initialBackgroundTransform,
  className,
}: PersonalDashboardCockpitGreetingProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-4 gap-y-1 px-0 py-0.5",
        className,
      )}
      data-testid="personal-dashboard-greeting"
    >
      <div className="min-w-0">
        <DashboardCompactWelcome greeting={greeting} highlightName={highlightName} />
        {contextLine ? (
          <p className="mt-0.5 text-[0.8125rem] font-medium leading-snug text-[var(--text-2)]">
            {contextLine}
          </p>
        ) : null}
      </div>

      <PersonalDashboardCustomizeDialog
        greeting={greeting}
        highlightName={highlightName}
        initialBackgroundImageUrl={initialBackgroundImageUrl}
        initialBackgroundTransform={initialBackgroundTransform}
      />
    </header>
  );
}
