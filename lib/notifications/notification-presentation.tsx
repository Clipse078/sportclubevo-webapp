import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Bell, ClipboardList } from "lucide-react";

export function notificationListIcon(input: {
  category: string;
  type: string;
}): { Icon: LucideIcon; className: string } {
  if (input.category === "REQUIREMENT") {
    if (input.type === "REQUIREMENT_OVERDUE") {
      return { Icon: AlertTriangle, className: "text-red-600 dark:text-red-400" };
    }
    if (input.type === "REQUIREMENT_REMINDER") {
      return { Icon: Bell, className: "text-[var(--sce-primary)]" };
    }
  }
  return { Icon: ClipboardList, className: "text-[var(--sce-primary)]" };
}
