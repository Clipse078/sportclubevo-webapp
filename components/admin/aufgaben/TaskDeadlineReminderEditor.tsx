"use client";

import { useTransition } from "react";
import { updateAufgabeDueAtAction } from "@/app/(admin)/dashboard/aufgaben/actions";
import type { TaskDto } from "@/lib/tasks/types";
import { TaskDeadlineFields, TaskReminderFields } from "./TaskReminderFields";

type Props = {
  task: TaskDto;
  timeZone: string;
  disabled?: boolean;
  onUpdated?: () => void;
  onError?: (message: string) => void;
};

export function TaskDeadlineReminderEditor({
  task,
  timeZone,
  disabled,
  onUpdated,
  onError,
}: Props) {
  const [pending, startTransition] = useTransition();

  function submit(form: HTMLFormElement) {
    const fd = new FormData(form);
    fd.set("taskId", task.id);
    startTransition(async () => {
      const result = await updateAufgabeDueAtAction(fd);
      if (!result.ok) {
        onError?.(result.message);
        return;
      }
      onUpdated?.();
    });
  }

  return (
    <form
      id={`deadline-form-${task.id}`}
      className="space-y-3"
      onChange={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      onSubmit={(e) => e.preventDefault()}
    >
      <TaskDeadlineFields
        timeZone={timeZone}
        dueAt={task.dueAt}
        disabled={disabled || pending}
      />
      <TaskReminderFields
        timeZone={timeZone}
        values={{
          reminder1At: task.reminder1At,
          reminder2At: task.reminder2At,
          reminder1PresetKey: task.reminder1PresetKey,
          reminder2PresetKey: task.reminder2PresetKey,
        }}
        disabled={disabled || pending}
      />
      {task.dueAt ? (
        <button
          type="button"
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          disabled={disabled || pending}
          onClick={() => {
            const form = document.getElementById(`deadline-form-${task.id}`) as HTMLFormElement | null;
            if (!form) return;
            const fd = new FormData(form);
            fd.set("taskId", task.id);
            fd.set("dueAt", "");
            fd.set("dueTime", "");
            fd.set("reminder1Preset", "");
            fd.set("reminder2Preset", "");
            startTransition(async () => {
              const result = await updateAufgabeDueAtAction(fd);
              if (!result.ok) onError?.(result.message);
              else onUpdated?.();
            });
          }}
        >
          Deadline entfernen
        </button>
      ) : null}
    </form>
  );
}
