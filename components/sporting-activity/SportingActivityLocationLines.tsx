import { cn } from "@/lib/cn";

export type SportingActivityLocationLinesProps = {
  lines: readonly string[];
  className?: string;
  /** compact rows use single-line truncate per line */
  density?: "compact" | "standard";
};

/**
 * Renders canonical location lines without field labels or placeholder noise.
 */
export function SportingActivityLocationLines({
  lines,
  className,
  density = "standard",
}: SportingActivityLocationLinesProps) {
  if (lines.length === 0) return null;

  return (
    <div className={cn("min-w-0 space-y-0.5", className)}>
      {lines.map((line) => (
        <p
          key={line}
          className={cn(
            "text-[0.6875rem] leading-snug text-[var(--muted)]",
            density === "compact" && "truncate",
          )}
        >
          {line}
        </p>
      ))}
    </div>
  );
}
