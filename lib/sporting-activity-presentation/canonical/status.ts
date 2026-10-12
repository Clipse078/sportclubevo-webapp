import type { PersonalProgrammePresentationStatus } from "@/lib/personal-agenda/personal-programme-types";
import type { SceActivityPresentationStatus, ScePresentationStatusSemantic } from "./types";

export function mapPersonalProgrammeStatusToSemantic(
  status: PersonalProgrammePresentationStatus | undefined,
): ScePresentationStatusSemantic {
  switch (status) {
    case "live":
      return "active";
    case "scheduled":
      return "planned";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "postponed":
      return "warning";
    default:
      return "neutral";
  }
}

export function buildSceActivityPresentationStatus(input: {
  domain?: PersonalProgrammePresentationStatus | string;
  label?: string;
  semantic?: ScePresentationStatusSemantic;
}): SceActivityPresentationStatus {
  const domainStatus =
    typeof input.domain === "string" &&
    (input.domain === "scheduled" ||
      input.domain === "cancelled" ||
      input.domain === "postponed" ||
      input.domain === "completed" ||
      input.domain === "live")
      ? (input.domain as PersonalProgrammePresentationStatus)
      : undefined;

  const semantic =
    input.semantic ??
    (domainStatus ? mapPersonalProgrammeStatusToSemantic(domainStatus) : "neutral");

  return {
    domain: input.domain,
    semantic,
    label: input.label,
  };
}

/** Maps Spiele management status labels to canonical semantic categories. */
export function mapSpieleStatusLabelToSemantic(label: string): ScePresentationStatusSemantic {
  const normalized = label.trim().toLowerCase();
  if (normalized === "live" || normalized.startsWith("live ")) return "active";
  if (normalized === "heute") return "warning";
  if (normalized === "morgen") return "planned";
  if (normalized === "beendet" || normalized === "gespielt") return "completed";
  if (normalized === "abgesagt") return "cancelled";
  if (normalized === "verschoben") return "warning";
  if (normalized.includes("offen") || normalized.includes("bereit")) return "planned";
  return "neutral";
}

/** Maps canonical presentation semantics to SCE Badge variants. */
export function mapScePresentationSemanticToBadgeVariant(
  semantic: ScePresentationStatusSemantic,
): "default" | "success" | "warning" | "danger" | "info" {
  switch (semantic) {
    case "active":
    case "completed":
      return "success";
    case "warning":
      return "warning";
    case "cancelled":
      return "danger";
    case "planned":
      return "info";
    case "neutral":
    default:
      return "default";
  }
}
