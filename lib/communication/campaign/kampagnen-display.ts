import { formatCampaignChannelSummary } from "@/lib/communication/campaign/campaign-orchestration-meta";
import type { CampaignOrchestrationMeta } from "@/lib/communication/campaign/campaign-orchestration-meta";
import { formatPersonDisplayName } from "@/lib/communication/inbox/inbox-display";

type KampagnenAuthorPerson = {
  id: string;
  firstName: string;
  lastName: string;
} | null;

export type KampagnenDisplayStatus = {
  label: string;
  tone: "default" | "success" | "muted" | "warning";
  srHint?: string;
};

export function resolveKampagnenDisplayStatus(input: {
  status: string;
  scheduleStatus?: string | null;
}): KampagnenDisplayStatus {
  if (input.scheduleStatus === "PROCESSING") {
    return {
      label: "Wird versendet",
      tone: "warning",
      srHint: "Geplante Veröffentlichung wird ausgeführt",
    };
  }
  if (input.scheduleStatus === "SCHEDULED") {
    return {
      label: "Geplant",
      tone: "warning",
      srHint: "Veröffentlichung ist geplant",
    };
  }
  switch (input.status) {
    case "DRAFT":
      return { label: "Entwurf", tone: "muted" };
    case "READY":
      return { label: "Bereit", tone: "default" };
    case "PUBLISHED":
      return {
        label: "Veröffentlicht",
        tone: "success",
        srHint: "Kampagne wurde veröffentlicht",
      };
    case "ARCHIVED":
      return { label: "Archiviert", tone: "muted" };
    default:
      return { label: input.status, tone: "muted" };
  }
}

export function formatKampagnenCreator(authorPerson: KampagnenAuthorPerson): string {
  if (!authorPerson) return "—";
  return formatPersonDisplayName(authorPerson);
}

export function formatKampagnenListTimestamp(input: {
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

export function kampagnenListTimeColumnLabel(input: {
  scheduleStatus?: string | null;
  status: string;
}): string {
  if (input.scheduleStatus === "SCHEDULED" || input.scheduleStatus === "PROCESSING") {
    return "Geplant für";
  }
  if (input.status === "PUBLISHED") return "Veröffentlicht";
  return "Aktualisiert";
}

export function formatKampagnenChannelSummary(
  orchestration: CampaignOrchestrationMeta | null | undefined,
): string {
  return formatCampaignChannelSummary(orchestration);
}

export function kampagnenListTitle(item: {
  subject: string | null;
  internalName: string;
  bodyText: string;
}): string {
  return item.subject?.trim() || item.internalName?.trim() || item.bodyText.slice(0, 80);
}

export const KAMPAGNE_PREFERENCES_NOTICE =
  "Die gewählte Zielgruppe legt fest, wer adressiert ist. Die tatsächliche Zustellung hängt von Kanälen, Präferenzen, Einwilligungen und Vereinsrichtlinien ab.";

export const KAMPAGNE_SAFEGUARDING_NOTICE =
  "Bei minderjährigen Mitgliedern werden Empfänger gemäss Vereinsrichtlinie über hinterlegte Erziehungsberechtigte angepasst.";

export const KAMPAGNE_PUBLISH_NOTICE =
  "Beim Veröffentlichen werden Empfänger aufgelöst, eingefroren und die Zustellung gestartet. Geplante Kampagnen werden zum gewählten Zeitpunkt veröffentlicht.";

export const KAMPAGNE_SPONSOR_COMMERCIAL_NOTICE =
  "Sponsor- und Partner-Kommunikation unterliegt der Kategorie Werbliche Kommunikation. Zielgruppenmitgliedschaft ersetzt keine werbliche Einwilligung.";
