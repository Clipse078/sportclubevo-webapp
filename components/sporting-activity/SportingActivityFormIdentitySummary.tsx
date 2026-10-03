import { cn } from "@/lib/cn";
import type { SportingActivityPresentation } from "@/lib/sporting-activity-presentation/types";
import type { SportingActivityKind } from "@/lib/sporting-activity-presentation/types";
import { SportingActivityMetaRail } from "./SportingActivityMetaRail";
import { SportingActivityIdentity } from "./SportingActivityIdentity";
import { EventDomainMetaRail } from "./EventDomainMetaRail";

export type SportingActivityFormIdentitySummaryProps = {
  activityKind: SportingActivityKind | "VERANSTALTUNG";
  title: string;
  typeLabel: string;
  startTimeLabel?: string;
  endTimeLabel?: string;
  /** Date + time or rhythm line below identity (editor/manage header). */
  scheduleLine?: string;
  presentation?: SportingActivityPresentation;
  className?: string;
};

/**
 * Read-only identity banner above create/edit forms — not a form control.
 */
export function SportingActivityFormIdentitySummary({
  activityKind,
  title,
  typeLabel,
  startTimeLabel,
  endTimeLabel,
  scheduleLine,
  presentation,
  className,
}: SportingActivityFormIdentitySummaryProps) {
  const isEvent = activityKind === "VERANSTALTUNG";

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_35%,transparent)] px-3 py-2.5",
        className,
      )}
      data-testid="sporting-activity-form-identity-summary"
    >
      {isEvent ? (
        <EventDomainMetaRail domainLabel={typeLabel} startTimeLabel={startTimeLabel} endTimeLabel={endTimeLabel} />
      ) : (
        <SportingActivityMetaRail
          activityKind={activityKind}
          typeLabel={typeLabel}
          startTimeLabel={startTimeLabel ?? "—"}
          endTimeLabel={endTimeLabel}
          density="management"
        />
      )}
      <div className="min-w-0 space-y-0.5">
        {presentation ? (
          <SportingActivityIdentity
            presentation={presentation}
            mode="management"
            showTypeLine={false}
            primaryWrap
          />
        ) : (
          <p className="text-[0.9375rem] font-semibold leading-snug text-[var(--foreground)]">{title}</p>
        )}
        {scheduleLine ? (
          <p
            className="text-sm text-[var(--text-2)]"
            data-testid="sporting-activity-form-identity-schedule"
          >
            {scheduleLine}
          </p>
        ) : null}
      </div>
    </div>
  );
}
