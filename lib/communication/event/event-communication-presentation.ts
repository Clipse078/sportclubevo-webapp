/**
 * SCE-COMM-10 — default reminder copy (presentation boundary; not hardcoded in domain services).
 */

export function defaultEventNoResponseReminderBody(eventTitle: string): string {
  const title = eventTitle.trim() || "das Event";
  return `Bitte gib noch Rückmeldung für ${title}.`;
}

export function defaultPollNonResponseReminderBody(): string {
  return "Bitte nimm noch an der Umfrage teil.";
}

export function defaultRequestNonResponseReminderBody(): string {
  return "Wer kann noch helfen? Bitte melde dich, wenn du unterstützen kannst.";
}

export function defaultRequestOpenCapacityReminderBody(input: {
  slotLabel: string;
  remainingCapacity: number;
}): string {
  const label = input.slotLabel.trim() || "Helfer";
  return `Für ${label} fehlen noch ${input.remainingCapacity} Helfer.`;
}

export function eventPresetPreviewLabel(preset: string, count: number): string {
  switch (preset) {
    case "NOT_RESPONDED":
      return `${count} Person${count === 1 ? "" : "en"} ohne Rückmeldung`;
    case "ACCEPTED_ONLY":
      return `${count} Zusage${count === 1 ? "" : "n"}`;
    case "DECLINED_ONLY":
      return `${count} Absage${count === 1 ? "" : "n"}`;
    case "ALL_INVITEES":
      return `${count} Empfänger`;
    default:
      return `${count} Empfänger`;
  }
}
