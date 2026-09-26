import { AlertTriangle } from "lucide-react";
import type { SceIconRegistryName } from "@/components/design-system/icons/registry";

export function notificationListIcon(input: {
  category: string;
  type: string;
}): { sceIcon: SceIconRegistryName; className: string; utilityIcon?: typeof AlertTriangle } {
  if (input.category === "REQUIREMENT") {
    if (input.type === "REQUIREMENT_OVERDUE") {
      return {
        sceIcon: "requirements",
        className: "text-red-600 dark:text-red-400",
        utilityIcon: AlertTriangle,
      };
    }
    if (input.type === "REQUIREMENT_REMINDER") {
      return { sceIcon: "notifications", className: "text-[var(--sce-primary)]" };
    }
  }
  return { sceIcon: "requirements", className: "text-[var(--sce-primary)]" };
}
