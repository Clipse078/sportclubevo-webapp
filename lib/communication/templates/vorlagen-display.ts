import type { PlatformCommunicationTemplateKind } from "@/lib/communication/templates/platform-template-constants";
import { formatCampaignChannelSummary } from "@/lib/communication/campaign/campaign-orchestration-meta";
import type { CampaignOrchestrationMeta } from "@/lib/communication/campaign/campaign-orchestration-meta";

export const VORLAGEN_OVERVIEW_DESCRIPTION =
  "Wiederverwendbare Inhalte für wiederkehrende Kommunikation. Vorlagen füllen neue Entwürfe — bereits gesendete Mitteilungen bleiben unverändert.";

export const VORLAGEN_EDIT_FUTURE_NOTICE =
  "Änderungen an dieser Vorlage gelten nur für künftige Verwendungen. Bereits erstellte oder veröffentlichte Kommunikationen werden nicht angepasst.";

export const VORLAGEN_CHANNEL_DEFAULTS_NOTICE =
  "Kanal-Defaults gelten beim Anlegen neuer Kommunikation. Sie garantieren keine Zustellung.";

export const VORLAGEN_SCHEDULING_BOUNDARY_NOTICE =
  "Vorlagen enthalten keine geplanten Sendungen. Zeitplanung erfolgt im Entwurf der Kommunikation.";

const KIND_LABELS: Record<PlatformCommunicationTemplateKind, string> = {
  CAMPAIGN: "Kampagne",
  MESSAGE: "Nachricht",
  ANNOUNCEMENT: "Mitteilung",
  ALERT: "Alarm",
};

const KIND_APPLICABILITY: Record<PlatformCommunicationTemplateKind, string> = {
  CAMPAIGN: "Kampagnen",
  MESSAGE: "Mitteilungen (Nachricht)",
  ANNOUNCEMENT: "Mitteilungen",
  ALERT: "Mitteilungen (Alarm)",
};

export function vorlageKindLabel(kind: string): string {
  return KIND_LABELS[kind as PlatformCommunicationTemplateKind] ?? "Kommunikation";
}

export function vorlageApplicabilityLabel(kind: string): string {
  return KIND_APPLICABILITY[kind as PlatformCommunicationTemplateKind] ?? "Kommunikation";
}

export function vorlageFilterKindLabel(filter: "CAMPAIGN" | "MITTEILUNGEN"): string {
  return filter === "CAMPAIGN" ? "Kampagnen" : "Mitteilungen";
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  ACTIVE: "Aktiv",
  ARCHIVED: "Archiviert",
};

export function vorlageStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function vorlageStatusTone(status: string): "success" | "muted" | "default" {
  if (status === "ACTIVE") return "success";
  if (status === "ARCHIVED") return "muted";
  return "default";
}

export function formatVorlagenListTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function buildVorlageContentPreview(bodyText: string, subject?: string | null): string {
  const fromBody = bodyText.replace(/\s+/g, " ").trim();
  const fromSubject = subject?.trim();
  const base = fromBody || fromSubject || "";
  if (base.length <= 140) return base || "—";
  return `${base.slice(0, 137)}…`;
}

export function formatVorlageChannelDefaults(orchestration: CampaignOrchestrationMeta): string {
  return formatCampaignChannelSummary(orchestration);
}

export function mitteilungTemplateKinds(): PlatformCommunicationTemplateKind[] {
  return ["MESSAGE", "ANNOUNCEMENT", "ALERT"];
}

export function kindMatchesMitteilungenFilter(kind: string): boolean {
  return mitteilungTemplateKinds().includes(kind as PlatformCommunicationTemplateKind);
}
