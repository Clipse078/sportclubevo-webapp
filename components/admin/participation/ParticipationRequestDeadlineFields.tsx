"use client";

import { TaskDeadlineFields, TaskReminderFields } from "@/components/admin/aufgaben/TaskReminderFields";

type Props = {
  timeZone: string;
  participationResponseDueAt: string | null;
  reminder1PresetKey: string | null;
  reminder2PresetKey: string | null;
  reminder1At: string | null;
  reminder2At: string | null;
  disabled?: boolean;
};

export function ParticipationRequestDeadlineFields({
  timeZone,
  participationResponseDueAt,
  reminder1PresetKey,
  reminder2PresetKey,
  reminder1At,
  reminder2At,
  disabled,
}: Props) {
  return (
    <div className="space-y-3 rounded-lg border border-[var(--border)] p-3" data-testid="participation-request-deadline-fields">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Teilnahme</p>
      <TaskDeadlineFields
        timeZone={timeZone}
        dueAt={participationResponseDueAt}
        disabled={disabled}
        dueDateName="participationResponseDueDate"
        dueTimeName="participationResponseDueTime"
      />
      <p className="text-xs text-[var(--muted)]">
        Bis wann Spieler bzw. Eltern ihre Teilnahme bestätigen sollen.
      </p>
      <TaskReminderFields
        timeZone={timeZone}
        disabled={disabled}
        values={{
          reminder1PresetKey,
          reminder2PresetKey,
          reminder1At,
          reminder2At,
        }}
      />
    </div>
  );
}
