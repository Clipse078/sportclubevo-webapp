import { prisma } from "@/lib/db/prisma";
import { parseTaskDueAtFromForm } from "@/lib/tasks/task-reminder-schedule";
import { parseTaskReminderFieldsFromForm } from "@/lib/tasks/parse-task-reminder-form";
import { resolveRequirementReminderSchedule } from "./requirement-reminder-schedule";

export type ParsedRequirementReminderForm =
  | {
      dueAt: Date | null;
      reminder1At: Date | null;
      reminder2At: Date | null;
      reminder1PresetKey: string | null;
      reminder2PresetKey: string | null;
      remindersConfigured: boolean;
    }
  | "invalid_due"
  | "invalid_reminder";

async function loadTenantTimeZone(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timezone: true },
  });
  return tenant?.timezone ?? "Europe/Zurich";
}

export async function parseRequirementDeadlineAndRemindersFromForm(
  tenantId: string,
  formData: FormData,
): Promise<ParsedRequirementReminderForm> {
  const timeZone = await loadTenantTimeZone(tenantId);
  const dueAt = parseTaskDueAtFromForm({
    dateRaw: formData.get("dueAt")?.toString(),
    timeRaw: formData.get("dueTime")?.toString(),
    timeZone,
  });
  if (dueAt === "invalid") return "invalid_due";

  const remindersConfigured =
    formData.has("reminder1Preset") ||
    formData.has("reminder2Preset") ||
    formData.has("reminder1CustomDate") ||
    formData.has("reminder2CustomDate");

  if (!remindersConfigured) {
    return {
      dueAt,
      reminder1At: null,
      reminder2At: null,
      reminder1PresetKey: null,
      reminder2PresetKey: null,
      remindersConfigured: false,
    };
  }

  const reminders = parseTaskReminderFieldsFromForm(formData, timeZone);
  if (reminders === "invalid") return "invalid_reminder";

  const resolved = resolveRequirementReminderSchedule({
    dueAt,
    reminder1At: reminders.reminder1At,
    reminder2At: reminders.reminder2At,
    reminder1PresetKey: reminders.reminder1PresetKey,
    reminder2PresetKey: reminders.reminder2PresetKey,
    timeZone,
    remindersConfigured: true,
  });

  return {
    dueAt: resolved.dueAt,
    reminder1At: resolved.reminder1At,
    reminder2At: resolved.reminder2At,
    reminder1PresetKey: resolved.reminder1PresetKey,
    reminder2PresetKey: resolved.reminder2PresetKey,
    remindersConfigured: true,
  };
}
