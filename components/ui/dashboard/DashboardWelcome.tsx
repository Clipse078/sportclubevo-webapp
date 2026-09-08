import { cn } from "@/lib/cn";

export type DashboardWelcomeProps = {
  /** Personalised greeting line (e.g. "Guten Morgen, Michael"). */
  greeting: string;
  /** Optional supporting subtitle below the greeting. */
  subtitle?: string;
  className?: string;
};

/**
 * DashboardWelcome
 *
 * Greeting text block for the dashboard hero area.
 * Renders the primary greeting heading and an optional subtitle.
 * Composable — used inside DashboardHero or standalone.
 *
 * Usage:
 *   <DashboardWelcome
 *     greeting="Guten Morgen, Michael"
 *     subtitle="Schön, dich wiederzusehen."
 *   />
 */
export function DashboardWelcome({
  greeting,
  subtitle,
  className,
}: DashboardWelcomeProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <h1 className="text-[1.875rem] font-bold leading-[1.15] tracking-tight text-[var(--foreground)] sm:text-[2rem] lg:text-[2.125rem]">
        {greeting}
      </h1>
      {subtitle && (
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-2)] sm:text-[0.9375rem]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
