"use client";

import { useTranslations } from "next-intl";
import { TaskDeadlineFields, TaskReminderFields } from "@/components/admin/aufgaben/TaskReminderFields";

type Props = {
  timeZone: string;
  participationResponseDueAt: string | null;
  reminder1PresetKey: string | null;
  reminder2PresetKey: string | null;
  reminder1At: string | null;
  reminder2At: string | null;
  disabled?: boolean;
  layout?: "default" | "sessionEdit";
};

export function ParticipationRequestDeadlineFields({
  timeZone,
  participationResponseDueAt,
  reminder1PresetKey,
  reminder2PresetKey,
  reminder1At,
  reminder2At,
  disabled,
  layout = "default",
}: Props) {
  const t = useTranslations("TrainingCenter.sessionEdit");
  const isSessionEdit = layout === "sessionEdit";

  return (
    <div
      className={
        isSessionEdit
          ? "space-y-4"
          : "space-y-3 rounded-lg border border-[var(--border)] p-3"
      }
      data-testid="participation-request-deadline-fields"
      data-layout={layout}
    >
      {!isSessionEdit ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Teilnahme</p>
      ) : null}

      <div className="space-y-2">
        {isSessionEdit ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t("responseDeadlineSection")}
          </p>
        ) : null}
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
      </div>

      <TaskReminderFields
        timeZone={timeZone}
        disabled={disabled}
        values={{
          reminder1PresetKey,
          reminder2PresetKey,
          reminder1At,
          reminder2At,
        }}
        sectionTitle={isSessionEdit ? t("remindersSection") : undefined}
      />
    </div>
  );
}
