function normalizeRequirementActionTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "Anforderung";
  if (/bestätigen$/i.test(trimmed)) return trimmed;
  return `${trimmed} bestätigen`;
}

export function buildRequirementAssignedCopy(input: {
  requirementTitle: string;
  subjectDisplayName?: string | null;
  notifyAsGuardian: boolean;
}): { title: string; body: string } {
  const actionTitle = normalizeRequirementActionTitle(input.requirementTitle);
  if (input.notifyAsGuardian && input.subjectDisplayName) {
    return {
      title: `${input.subjectDisplayName}: ${actionTitle}`,
      body: `Neue Anforderung für ${input.subjectDisplayName}.`,
    };
  }
  return {
    title: `Neue Anforderung: ${actionTitle}`,
    body: actionTitle,
  };
}

/** Canonical automatic reminder channel (mutually exclusive per Requirement). */
export type RequirementAutomaticReminderChannel =
  | "due_soon_window"
  | "configured_stage_1"
  | "configured_stage_2";

function requirementReminderStageHint(
  channel: RequirementAutomaticReminderChannel | undefined,
): string {
  switch (channel) {
    case "configured_stage_1":
      return "Geplante Erinnerung (1/2).";
    case "configured_stage_2":
      return "Geplante Erinnerung (2/2).";
    case "due_soon_window":
      return "Die Frist rückt näher.";
    default:
      return "Bitte erledige diese Anforderung rechtzeitig.";
  }
}

export function buildRequirementReminderCopy(input: {
  requirementTitle: string;
  subjectDisplayName?: string | null;
  notifyAsGuardian: boolean;
  dueLabel?: string | null;
  reminderChannel?: RequirementAutomaticReminderChannel;
}): { title: string; body: string } {
  const actionTitle = normalizeRequirementActionTitle(input.requirementTitle);
  const stageHint = requirementReminderStageHint(input.reminderChannel);
  const dueSuffix = input.dueLabel ? `\n\nFällig: ${input.dueLabel}` : "";
  if (input.notifyAsGuardian && input.subjectDisplayName) {
    return {
      title: `Erinnerung: ${input.subjectDisplayName}: ${actionTitle}`,
      body: `${stageHint} Erinnerung für ${input.subjectDisplayName}.${dueSuffix}`,
    };
  }
  return {
    title: `Erinnerung: ${actionTitle}`,
    body: `${stageHint}${dueSuffix}`,
  };
}

export function buildRequirementOverdueCopy(input: {
  requirementTitle: string;
  subjectDisplayName?: string | null;
  notifyAsGuardian: boolean;
  dueLabel?: string | null;
}): { title: string; body: string } {
  const actionTitle = normalizeRequirementActionTitle(input.requirementTitle);
  const dueSuffix = input.dueLabel ? ` (${input.dueLabel})` : "";
  if (input.notifyAsGuardian && input.subjectDisplayName) {
    return {
      title: `Überfällig: ${input.subjectDisplayName}: ${actionTitle}`,
      body: `Die Frist für ${input.subjectDisplayName} ist abgelaufen${dueSuffix}.`,
    };
  }
  return {
    title: `Überfällig: ${actionTitle}`,
    body: `Die Frist ist abgelaufen${dueSuffix}.`,
  };
}

export function buildRequirementCancelledCopy(input: {
  requirementTitle: string;
  subjectDisplayName?: string | null;
  notifyAsGuardian: boolean;
}): { title: string; body: string } {
  const trimmed = input.requirementTitle.trim() || "Anforderung";
  if (input.notifyAsGuardian && input.subjectDisplayName) {
    return {
      title: `Anforderung aufgehoben: ${input.subjectDisplayName}: ${trimmed}`,
      body: `Die Anforderung für ${input.subjectDisplayName} wurde aufgehoben.`,
    };
  }
  return {
    title: `Anforderung aufgehoben: ${trimmed}`,
    body: "Diese Anforderung gilt nicht mehr.",
  };
}
