import { cn } from "@/lib/cn";
import { trainingManagementStatusPresentation } from "@/lib/training/management-presentation";
import type { TrainingSeriesStatus } from "@/lib/training/types";

type Props = {
  status: TrainingSeriesStatus;
  className?: string;
  showDot?: boolean;
};

export default function TrainingRecordStatusBadge({ status, className, showDot = true }: Props) {
  const presentation = trainingManagementStatusPresentation(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide",
        presentation.badgeClassName,
        className,
      )}
      data-testid="training-record-status-badge"
    >
      {showDot ? (
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", presentation.dotClassName)} aria-hidden />
      ) : null}
      {presentation.label}
    </span>
  );
}
