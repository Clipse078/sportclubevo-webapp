"use client";

import { Button } from "@/components/ui/Button";
import { SceSemanticFeedback } from "@/components/sce/feedback/SceSemanticFeedback";

export type SceActionableErrorProps = {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  onDismiss?: () => void;
  dismissLabel?: string;
  technicalReference?: string;
  className?: string;
  "data-testid"?: string;
};

export function SceActionableError({
  title,
  description,
  onRetry,
  retryLabel = "Erneut versuchen",
  onDismiss,
  dismissLabel = "Schliessen",
  technicalReference,
  className,
  "data-testid": testId = "sce-actionable-error",
}: SceActionableErrorProps) {
  const hasActions = Boolean(onRetry || onDismiss);

  return (
    <SceSemanticFeedback
      tone="ERROR"
      title={title}
      description={description}
      data-testid={testId}
      className={className}
      action={
        hasActions ? (
          <div className="flex flex-wrap gap-2">
            {onRetry ? (
              <Button type="button" size="sm" onClick={onRetry} data-sce-action-hierarchy="PRIMARY">
                {retryLabel}
              </Button>
            ) : null}
            {onDismiss ? (
              <Button type="button" size="sm" variant="secondary" onClick={onDismiss}>
                {dismissLabel}
              </Button>
            ) : null}
          </div>
        ) : undefined
      }
    />
  );
}
