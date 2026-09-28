import type { ClubCommunicationListItem } from "@/lib/communication/club/club-communication-service";
import { formatPersonDisplayName } from "@/lib/communication/inbox/inbox-display";

export const MITTEILUNG_KIND_LABEL: Record<string, string> = {
  MESSAGE: "Nachricht",
  ANNOUNCEMENT: "Mitteilung",
  ALERT: "Alarm",
};

export function mitteilungKindLabel(kind: string): string | null {
  if (kind === "ALERT") return MITTEILUNG_KIND_LABEL.ALERT;
  if (kind === "MESSAGE") return MITTEILUNG_KIND_LABEL.MESSAGE;
  return null;
}

export type MitteilungDisplayStatus = {
  label: string;
  tone: "default" | "success" | "muted" | "warning";
  srHint?: string;
};

export function resolveMitteilungDisplayStatus(input: {
  status: string;
  scheduleStatus?: string | null;
}): MitteilungDisplayStatus {
  if (input.scheduleStatus === "SCHEDULED" || input.scheduleStatus === "PROCESSING") {
    return {
      label: "Geplant",
      tone: "warning",
      srHint: "Veröffentlichung ist geplant",
    };
  }
  switch (input.status) {
    case "DRAFT":
      return { label: "Entwurf", tone: "muted" };
    case "PUBLISHED":
      return { label: "Gesendet", tone: "success", srHint: "Mitteilung wurde veröffentlicht" };
    case "ARCHIVED":
      return { label: "Archiviert", tone: "muted" };
    default:
      return { label: input.status, tone: "muted" };
  }
}

export function formatMitteilungCreator(
  senderPerson: ClubCommunicationListItem["senderPerson"],
): string {
  if (!senderPerson) return "—";
  return formatPersonDisplayName(senderPerson);
}

export function formatMitteilungListTimestamp(input: {
  status: string;
  publishedAt: string | null;
  createdAt: string;
  scheduledAt?: string | null;
  scheduleStatus?: string | null;
}): string {
  if (
    (input.scheduleStatus === "SCHEDULED" || input.scheduleStatus === "PROCESSING") &&
    input.scheduledAt
  ) {
    return new Date(input.scheduledAt).toLocaleString("de-CH");
  }
  if (input.status === "PUBLISHED" && input.publishedAt) {
    return new Date(input.publishedAt).toLocaleString("de-CH");
  }
  return new Date(input.createdAt).toLocaleString("de-CH");
}

export function mitteilungListTimeColumnLabel(input: {
  scheduleStatus?: string | null;
  status: string;
}): string {
  if (input.scheduleStatus === "SCHEDULED" || input.scheduleStatus === "PROCESSING") {
    return "Geplant für";
  }
  if (input.status === "PUBLISHED") return "Gesendet";
  return "Erstellt";
}

export const MITTEILUNG_SAFEGUARDING_NOTICE =
  "Bei minderjährigen Mitgliedern wird die Mitteilung gemäss Vereinsrichtlinie an die hinterlegten Erziehungsberechtigten zugestellt.";

export const MITTEILUNG_PREFERENCES_NOTICE =
  "Die Zielgruppe legt fest, wer adressiert ist. Die tatsächliche Zustellung hängt von Kanälen, Einwilligungen und Vereinsrichtlinien ab.";

export const MITTEILUNG_PUBLISH_NOTICE =
  "Beim Senden werden Empfänger aufgelöst, eingefroren und die Zustellung gestartet. Dieser Schritt kann nicht rückgängig gemacht werden.";
