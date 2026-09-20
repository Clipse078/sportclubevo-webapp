export function buildParticipationReminderCopy(input: {
  participantDisplayName: string;
  eventTitle: string;
  dueLabel: string;
  stage: 1 | 2;
}): { title: string; body: string } {
  const stageHint = input.stage === 1 ? "Erste Erinnerung" : "Zweite Erinnerung";
  return {
    title: "Teilnahme bestätigen",
    body: `${stageHint}: Bitte bestätige die Teilnahme von ${input.participantDisplayName} für ${input.eventTitle}.\n\nAntwortfrist: ${input.dueLabel}`,
  };
}

export function buildParticipationOverdueCopy(input: {
  participantDisplayName: string;
  dueLabel: string;
}): { title: string; body: string } {
  return {
    title: "Antwort ausstehend",
    body: `Die Antwortfrist für ${input.participantDisplayName} ist abgelaufen (${input.dueLabel}).`,
  };
}
