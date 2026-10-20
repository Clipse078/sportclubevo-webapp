"use client";

import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SceSemanticFeedbackTone } from "@/lib/design-system/sce-feedback-status-foundation";
import {
  sceFeedbackPanelClass,
  sceSemanticIconClass,
} from "@/lib/design-system/sce-feedback-status-micro-ux";

export type SceSemanticFeedbackProps = {
  tone: SceSemanticFeedbackTone;
  title: string;
  description?: string;
  action?: ReactNode;
  /** alert for errors; status otherwise */
  live?: "polite" | "assertive" | "off";
  className?: string;
  "data-testid"?: string;
};

function SemanticIcon({ tone }: { tone: SceSemanticFeedbackTone }) {
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
      return <Info className={className} aria-hidden />;
  }
}

export function SceSemanticFeedback({
  tone,
  title,
  description,
  action,
  live = tone === "ERROR" ? "assertive" : "polite",
  className,
  "data-testid": testId,
}: SceSemanticFeedbackProps) {
  const role = tone === "ERROR" ? "alert" : "status";

  return (
    <div
      role={role}
      aria-live={live === "off" ? undefined : live}
      data-sce-semantic-feedback={tone}
      data-testid={testId}
      className={cn(sceFeedbackPanelClass(tone, "space-y-2"), className)}
    >
      <div className="flex gap-2.5">
        <SemanticIcon tone={tone} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
          {description ? (
            <p className="text-sm text-[var(--text-2)]">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="pl-6 pt-1">{action}</div> : null}
    </div>
  );
}
