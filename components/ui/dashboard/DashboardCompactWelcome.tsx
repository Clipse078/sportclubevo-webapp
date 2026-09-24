import { cn } from "@/lib/cn";

export type DashboardCompactWelcomeProps = {
  greeting: string;
  highlightName?: string;
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

/** Compact dashboard greeting — no marketing hero scale. */
export function DashboardCompactWelcome({
  greeting,
  highlightName,
  className,
}: DashboardCompactWelcomeProps) {
  return (
    <h1
      className={cn(
        "text-lg font-semibold leading-tight tracking-tight text-[var(--foreground)] sm:text-xl",
        className,
      )}
    >
      {renderGreeting(greeting, highlightName)}
    </h1>
  );
}
