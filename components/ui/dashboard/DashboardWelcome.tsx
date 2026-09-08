import { cn } from "@/lib/cn";

export type DashboardWelcomeProps = {
  /** Personalised greeting line (e.g. "Guten Morgen, Michael"). */
  greeting: string;
  /** First name highlighted in SCE orange, matching the approved design. */
  highlightName?: string;
  /** Optional supporting subtitle below the greeting. */
  subtitle?: string;
  /** Renders the "WILLKOMMEN ZURÜCK" eyebrow above the greeting. */
  showEyebrow?: boolean;
  className?: string;
};

function renderGreeting(greeting: string, highlightName?: string) {
  if (!highlightName) return greeting;

  const index = greeting.indexOf(highlightName);
  if (index === -1) return greeting;

  const before = greeting.slice(0, index);
  const after = greeting.slice(index + highlightName.length);

  return (
    <>
      {before}
      <span className="text-[var(--sce-primary)]">{highlightName}</span>
      {after || "!"}
    </>
  );
}

/**
 * Greeting text block for the dashboard hero area.
 */
export function DashboardWelcome({
  greeting,
  highlightName,
  subtitle,
  showEyebrow = false,
  className,
}: DashboardWelcomeProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      {showEyebrow && (
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-[var(--sce-primary)]">
          Willkommen zurück
        </p>
      )}
      <h1 className="text-[1.875rem] font-bold leading-[1.08] tracking-tight text-[var(--foreground)] sm:text-[2.125rem] lg:text-[2.5rem]">
        {renderGreeting(greeting, highlightName)}
      </h1>
      {subtitle && (
        <p className="max-w-xl text-[0.8125rem] leading-snug text-[var(--text-2)] sm:text-[0.875rem]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
