import { Check, Circle, HelpCircle, X } from "lucide-react";
import type { MatchAvailabilityTone } from "@/lib/match-squad/match-availability-presentation";

type Props = {
  label: string;
  tone?: MatchAvailabilityTone;
  icon?: "check" | "x" | "help" | "circle";
  size?: "sm" | "md";
  testId?: string;
  className?: string;
};

function toneClasses(tone: MatchAvailabilityTone): string {
  switch (tone) {
    case "success":
      return "border-[var(--sce-success-border)] bg-[var(--sce-success-light)] text-[var(--sce-success)]";
    case "danger":
      return "border-[var(--sce-danger-border)] bg-[var(--sce-danger-light)] text-[var(--sce-danger)]";
    case "warning":
      return "border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] text-[var(--sce-warning)]";
    case "muted":
    default:
      return "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]";
  }
}

function StatusIcon({ icon, className }: { icon: Props["icon"]; className: string }) {
  const props = { className, "aria-hidden": true as const };
  switch (icon) {
    case "check":
      return <Check {...props} />;
    case "x":
      return <X {...props} />;
    case "help":
      return <HelpCircle {...props} />;
    case "circle":
    default:
      return <Circle {...props} />;
  }
}

export default function MatchAvailabilityStatusBadge({
  label,
  tone = "muted",
  icon = "circle",
  size = "sm",
  testId,
  className = "",
}: Props) {
  const sizeClasses =
    size === "md"
      ? "gap-1.5 px-2.5 py-1 text-xs"
      : "gap-1 px-2 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center rounded-full border font-semibold ${sizeClasses} ${toneClasses(tone)} ${className}`}
      data-testid={testId}
    >
      <StatusIcon icon={icon} className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function MatchAvailabilityConflictBadge({ testId }: { testId?: string }) {
  return (
    <span
      className="inline-flex max-w-full shrink-0 items-center rounded-full border border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--sce-warning)]"
      data-testid={testId}
    >
      Aufgebot prüfen
    </span>
  );
}
