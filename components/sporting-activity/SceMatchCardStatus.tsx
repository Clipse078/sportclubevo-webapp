import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { mapScePresentationSemanticToBadgeVariant } from "@/lib/sporting-activity-presentation/canonical/status";
import type { SceActivityPresentationStatus } from "@/lib/sporting-activity-presentation/canonical/types";

export type SceMatchCardStatusProps = {
  status: SceActivityPresentationStatus;
  testId?: string;
  className?: string;
};

/** Lifecycle / semantic status — label always visible; colour is supplementary. */
export function SceMatchCardStatus({
  status,
  testId = "sce-match-status",
  className,
}: SceMatchCardStatusProps) {
  const label = status.label?.trim();
  if (!label) return null;

  return (
    <Badge
      variant={mapScePresentationSemanticToBadgeVariant(status.semantic)}
      size="sm"
      className={cn("shrink-0 font-medium", className)}
      data-testid={testId}
      data-semantic={status.semantic}
    >
      {label}
    </Badge>
  );
}
