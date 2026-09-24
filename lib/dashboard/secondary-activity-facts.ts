import type { EventType } from "@prisma/client";

/** Structured facts for secondary dashboard activity — localized in the UI layer. */
export type PersonalDashboardSecondaryActivity =
  | {
      key: string;
      date: Date;
      kind: "news";
      title: string;
      authorName: string | null;
    }
  | {
      key: string;
      date: Date;
      kind: "registration";
      firstName: string;
      lastName: string;
      registrationType: string;
    }
  | {
      key: string;
      date: Date;
      kind: "event";
      title: string;
      eventType: EventType;
    }
  | {
      key: string;
      date: Date;
      kind: "meeting";
      title: string;
    };

export function eventTypeToSecondaryMessageKey(eventType: EventType): string {
  switch (eventType) {
    case "TRAINING":
      return "eventTypeTraining";
    case "MATCH":
      return "eventTypeMatch";
    case "TOURNAMENT":
      return "eventTypeTournament";
    case "OTHER":
      return "eventTypeOther";
    default:
      return "eventTypeGeneric";
  }
}

export function registrationTypeToSecondaryMessageKey(registrationType: string): string {
  return registrationType === "PROBETRAINING"
    ? "registrationTrial"
    : "registrationPlayer";
}
