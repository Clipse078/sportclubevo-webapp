import {
  parseCustomReminderAtFromForm,
  parseTaskReminderPresetKey,
} from "./task-reminder-schedule";

export type ParsedTaskReminderForm = {
  reminder1PresetKey: string | null;
  reminder2PresetKey: string | null;
  reminder1At: Date | null;
  reminder2At: Date | null;
};

export function parseTaskReminderFieldsFromForm(
  formData: FormData,
  timeZone: string,
): ParsedTaskReminderForm | "invalid" {
  const r1Preset = parseTaskReminderPresetKey(formData.get("reminder1Preset"));
  const r2Preset = parseTaskReminderPresetKey(formData.get("reminder2Preset"));
  if (r1Preset === "invalid" || r2Preset === "invalid") return "invalid";

  let reminder1At: Date | null = null;
  let reminder2At: Date | null = null;

  if (r1Preset === null && formData.get("reminder1Preset") === "CUSTOM") {
    const parsed = parseCustomReminderAtFromForm({
      dateRaw: formData.get("reminder1Date")?.toString(),
      timeRaw: formData.get("reminder1Time")?.toString(),
      timeZone,
    });
    if (parsed === "invalid") return "invalid";
    reminder1At = parsed;
  }

  if (r2Preset === null && formData.get("reminder2Preset") === "CUSTOM") {
    const parsed = parseCustomReminderAtFromForm({
      dateRaw: formData.get("reminder2Date")?.toString(),
      timeRaw: formData.get("reminder2Time")?.toString(),
      timeZone,
    });
    if (parsed === "invalid") return "invalid";
    reminder2At = parsed;
  }

  return {
    reminder1PresetKey: r1Preset,
    reminder2PresetKey: r2Preset,
    reminder1At,
    reminder2At,
  };
}
