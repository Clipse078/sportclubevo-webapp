import type { TrainingSeriesStatus } from "@/lib/training/types";
import { buildSceActivityPresentationStatus } from "./status";
import type { SceActivityPresentationStatus } from "./types";

export function resolveSceTrainingManagementStatus(
  status: TrainingSeriesStatus,
): SceActivityPresentationStatus {
  switch (status) {
    case "ACTIVE":
      return buildSceActivityPresentationStatus({
        domain: status,
        semantic: "active",
        label: "Aktiv",
      });
    case "INACTIVE":
      return buildSceActivityPresentationStatus({
        domain: status,
        semantic: "neutral",
        label: "Inaktiv",
      });
    case "ARCHIVED":
      return buildSceActivityPresentationStatus({
        domain: status,
        semantic: "completed",
        label: "Archiviert",
      });
    default:
      return buildSceActivityPresentationStatus({
        domain: status,
        label: status,
      });
  }
}
