import Link from "next/link";
import { CalendarDays, Layers } from "lucide-react";
import type { ReactNode } from "react";
import PlanningEditorHeader from "@/components/admin/shared/planning-editor/PlanningEditorHeader";

type Props = {
  backHref: string;
  backLabel: string;
  title: string;
  scheduleContext: string;
  seriesEditHref: string;
  wochenplanerHref: string;
  toSeriesLabel: string;
  wochenplanerLabel: string;
};

export default function TrainingSessionEditHeader({
  backHref,
  backLabel,
  title,
  scheduleContext,
  seriesEditHref,
  wochenplanerHref,
  toSeriesLabel,
  wochenplanerLabel,
}: Props) {
  const actions: ReactNode = (
    <>
      <Link
        href={seriesEditHref}
        className="fca-button-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
        data-testid="training-session-edit-series-link"
      >
        <Layers className="h-3.5 w-3.5" aria-hidden="true" />
        {toSeriesLabel}
      </Link>
      <Link
        href={wochenplanerHref}
        className="fca-button-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
        data-testid="training-session-edit-wochenplaner-link"
      >
        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
        {wochenplanerLabel}
      </Link>
    </>
  );

  return (
    <PlanningEditorHeader
      backHref={backHref}
      backLabel={backLabel}
      title={title}
      scheduleContext={scheduleContext}
      actions={actions}
      testId="training-session-edit-header"
      backLinkTestId="training-session-edit-back-link"
      contextTestId="training-session-edit-schedule-context"
    />
  );
}
