"use client";

import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Circle, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import type {
  SceReadinessStatusRow,
  SceSemanticFeedbackTone,
} from "@/lib/design-system/sce-feedback-status-foundation";
import { sceSemanticIconClass } from "@/lib/design-system/sce-feedback-status-micro-ux";

export type SceReadinessStatusPanelProps = {
  title: string;
  description?: string;
  headline?: string;
  headlineTone?: SceSemanticFeedbackTone;
  rows?: SceReadinessStatusRow[];
  primaryAction?: ReactNode;
  density?: "compact" | "standard";
  className?: string;
  "data-testid"?: string;
  headingId?: string;
};

function RowIcon({ tone }: { tone: SceSemanticFeedbackTone }) {
  const className = cn("h-4 w-4 shrink-0", sceSemanticIconClass(tone));
  switch (tone) {
    case "SUCCESS":
      return <CheckCircle2 className={className} aria-hidden />;
    case "WARNING":
      return <AlertTriangle className={className} aria-hidden />;
    case "ERROR":
      return <AlertCircle className={className} aria-hidden />;
    case "INFO":
      return <Info className={className} aria-hidden />;
    default:
      return <Circle className={className} aria-hidden />;
  }
}

function headlineBadgeClass(tone: SceSemanticFeedbackTone): string {
  switch (tone) {
    case "SUCCESS":
      return "border-[var(--sce-success)]/30 bg-[var(--sce-success)]/10 text-[var(--foreground)]";
    case "WARNING":
      return "border-[var(--sce-warning)]/35 bg-[var(--sce-warning)]/10 text-[var(--foreground)]";
    case "ERROR":
      return "border-[var(--sce-danger)]/35 bg-[var(--sce-danger)]/10 text-[var(--foreground)]";
    default:
      return "border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)]";
  }
}

export function SceReadinessStatusPanel({
  title,
  description,
  headline,
  headlineTone = "NEUTRAL",
  rows = [],
  primaryAction,
  density = "standard",
  className,
  "data-testid": testId,
  headingId,
}: SceReadinessStatusPanelProps) {
  const resolvedHeadingId = headingId ?? "sce-readiness-panel-heading";

  return (
    <section
      aria-labelledby={resolvedHeadingId}
      data-sce-readiness-panel
      data-testid={testId}
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--surface-1)]",
        density === "compact" ? "space-y-2 p-3 md:p-4" : "space-y-3 p-4 md:p-5",
        className,
      )}
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2
            id={resolvedHeadingId}
            className="text-base font-semibold text-[var(--foreground)]"
          >
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-[var(--text-2)]">{description}</p>
          ) : null}
        </div>
        {headline ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              headlineBadgeClass(headlineTone),
            )}
            data-sce-readiness-headline
          >
            {headline}
          </span>
        ) : null}
      </div>

      {rows.length > 0 ? (
        <ul
          className={cn("space-y-2", density === "compact" ? "mt-2" : "mt-3")}
          aria-label={`${title} Prüfpunkte`}
          data-sce-readiness-rows
        >
          {rows.map((row) => (
            <li key={row.id} className="flex gap-2 text-sm text-[var(--text-2)]">
              <span className="sr-only">{row.stateLabel}:</span>
              <RowIcon tone={row.tone} />
              <span>
                <span className="font-medium text-[var(--foreground)]">{row.label}</span>
                {row.detail ? (
                  <span className="block text-[var(--text-2)]">{row.detail}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {primaryAction ? <div className="pt-1">{primaryAction}</div> : null}
    </section>
  );
}
