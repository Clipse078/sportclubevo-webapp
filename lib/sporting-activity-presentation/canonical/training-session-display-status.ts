import type { TrainingSessionManagementRow } from "@/lib/training/management-session-view";
import { buildSceActivityPresentationStatus } from "./status";
import type { SceActivityPresentationStatus } from "./types";

export function resolveSceTrainingSessionDisplayStatus(
  row: Pick<TrainingSessionManagementRow, "displayStatus" | "status">,
): SceActivityPresentationStatus {
  switch (row.displayStatus) {
    case "GEPLANT":
      return buildSceActivityPresentationStatus({
        domain: row.status,
        semantic: "active",
        label: "Geplant",
      });
    case "AUSNAHME":
      return buildSceActivityPresentationStatus({
        domain: row.status,
        semantic: "warning",
        label: "Ausnahme",
      });
    case "ABGESAGT":
      return buildSceActivityPresentationStatus({
        domain: row.status,
        semantic: "cancelled",
        label: "Abgesagt",
      });
    default:
      return buildSceActivityPresentationStatus({
        domain: row.status,
        label: row.displayStatus,
      });
  }
}
