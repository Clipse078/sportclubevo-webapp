import type { MeetingStatus } from "@prisma/client";

export function meetingProtocolPrintPath(slug: string): string {
  return `/vereinsleitung/meetings/${slug}/protokoll`;
}

export function meetingProtocolPrintUnavailableReason(status: MeetingStatus): string | null {
  if (status === "CANCELLED") {
    return "Protokolldruck ist für abgesagte Sitzungen nicht verfügbar.";
  }
  return null;
}

export function meetingProtocolPrintDraftHint(status: MeetingStatus): string | null {
  if (status === "PLANNED") {
    return "Protokollentwurf drucken (Sitzung noch nicht abgeschlossen).";
  }
  return null;
}
