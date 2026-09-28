import { resolveKampagnenDisplayStatus } from "@/lib/communication/campaign/kampagnen-display";
import { resolveMitteilungDisplayStatus } from "@/lib/communication/club/mitteilungen-display";
import { vorlageStatusLabel } from "@/lib/communication/templates/vorlagen-display";

const REQUIREMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  ACTIVE: "Aktiv",
  CLOSED: "Abgeschlossen",
  CANCELLED: "Abgebrochen",
};

/** Human-readable status for platform communication rows in usage panels. */
export function platformCommunicationUsageStatusLabel(kind: string, status: string): string {
  if (kind === "CAMPAIGN") {
    return resolveKampagnenDisplayStatus({ status }).label;
  }
  return resolveMitteilungDisplayStatus({ status }).label;
}

/** Human-readable status hint for Zielgruppe usage references. */
export function zielgruppeUsageStatusLabel(
  kind: "CAMPAIGN" | "CLUB_MESSAGE" | "TEMPLATE" | "REQUIREMENT" | "REGISTRATION",
  statusHint: string | null | undefined,
): string | null {
  if (!statusHint?.trim()) return null;
  if (kind === "TEMPLATE") {
    return vorlageStatusLabel(statusHint);
  }
  if (kind === "CAMPAIGN") {
    return resolveKampagnenDisplayStatus({ status: statusHint }).label;
  }
  if (kind === "CLUB_MESSAGE") {
    return resolveMitteilungDisplayStatus({ status: statusHint }).label;
  }
  if (kind === "REQUIREMENT") {
    return REQUIREMENT_STATUS_LABELS[statusHint] ?? statusHint;
  }
  return statusHint;
}
