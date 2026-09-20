import {
  parseParticipationCustomReminderFromForm,
  parseParticipationReminderPresetFromForm,
  parseParticipationResponseDueFromForm,
} from "./participation-response-deadline-schedule";
import { ParticipationValidationError } from "./errors";

export type ParsedParticipationRequestForm = {
  participationResponseDueAt?: Date | null;
  participationReminder1At?: Date | null;
  participationReminder2At?: Date | null;
  participationReminder1PresetKey?: string | null;
  participationReminder2PresetKey?: string | null;
};

function readFormString(body: Record<string, unknown>, key: string): string | null {
  const raw = body[key];
  if (raw === null || raw === undefined) return null;
  return typeof raw === "string" ? raw : null;
}

export function parseParticipationRequestConfigBody(
  body: Record<string, unknown>,
  timeZone: string,
): ParsedParticipationRequestForm {
  const dueDate = readFormString(body, "participationResponseDueDate");
  const dueTime = readFormString(body, "participationResponseDueTime");
  const clearDue = body.participationResponseDueClear === true;

  let participationResponseDueAt: Date | null | undefined = undefined;
  if (clearDue) {
    participationResponseDueAt = null;
  } else if (dueDate) {
    const parsed = parseParticipationResponseDueFromForm({
      dateRaw: dueDate,
      timeRaw: dueTime,
      timeZone,
    });
    if (parsed === "invalid") {
      throw new ParticipationValidationError("Ungültige Antwortfrist.");
    }
    participationResponseDueAt = parsed;
  }

  const r1PresetRaw = body.participationReminder1Preset ?? body.reminder1Preset;
  const r2PresetRaw = body.participationReminder2Preset ?? body.reminder2Preset;
  const r1Preset = parseParticipationReminderPresetFromForm(r1PresetRaw);
  const r2Preset = parseParticipationReminderPresetFromForm(r2PresetRaw);
  if (r1Preset === "invalid" || r2Preset === "invalid") {
    throw new ParticipationValidationError("Ungültige Erinnerungs-Voreinstellung.");
  }

  let participationReminder1At: Date | null | undefined = undefined;
  let participationReminder2At: Date | null | undefined = undefined;
  let participationReminder1PresetKey: string | null | undefined = undefined;
  let participationReminder2PresetKey: string | null | undefined = undefined;

  if (r1PresetRaw !== undefined) {
    participationReminder1PresetKey = r1Preset;
  }
  if (r2PresetRaw !== undefined) {
    participationReminder2PresetKey = r2Preset;
  }

  if (r1Preset === null && typeof r1PresetRaw === "string" && r1PresetRaw.trim() === "CUSTOM") {
    const parsed = parseParticipationCustomReminderFromForm({
      dateRaw:
        readFormString(body, "participationReminder1Date") ??
        readFormString(body, "reminder1Date"),
      timeRaw:
        readFormString(body, "participationReminder1Time") ??
        readFormString(body, "reminder1Time"),
      timeZone,
    });
    if (parsed === "invalid") {
      throw new ParticipationValidationError("Ungültige 1. Erinnerung.");
    }
    participationReminder1At = parsed;
  }

  if (r2Preset === null && typeof r2PresetRaw === "string" && r2PresetRaw.trim() === "CUSTOM") {
    const parsed = parseParticipationCustomReminderFromForm({
      dateRaw:
        readFormString(body, "participationReminder2Date") ??
        readFormString(body, "reminder2Date"),
      timeRaw:
        readFormString(body, "participationReminder2Time") ??
        readFormString(body, "reminder2Time"),
      timeZone,
    });
    if (parsed === "invalid") {
      throw new ParticipationValidationError("Ungültige 2. Erinnerung.");
    }
    participationReminder2At = parsed;
  }

  return {
    participationResponseDueAt,
    participationReminder1At,
    participationReminder2At,
    participationReminder1PresetKey,
    participationReminder2PresetKey,
  };
}
