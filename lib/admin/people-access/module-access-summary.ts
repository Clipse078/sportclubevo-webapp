import type { EffectiveAccessModuleGroup } from "@/lib/roles/effective-access-summary";
import { moduleLabel } from "@/lib/roles/module-labels";

const ADMIN_MODULES = new Set([
  "USERS",
  "ROLES",
  "ADMIN",
  "SETTINGS",
  "TENANT",
]);

export type ModuleAccessLevel = "Vollzugriff" | "Bearbeiten" | "Ansehen" | "Teambezogen" | "Kein Zugriff";

export type ModuleAccessRow = {
  moduleLabel: string;
  level: ModuleAccessLevel;
  scopeHint?: string;
};

/**
 * Derives a concise module summary from effective-access groups.
 * Uses simple Zugriff/Kein Zugriff when granular levels cannot be determined.
 */
export function buildModuleAccessSummary(
  groups: EffectiveAccessModuleGroup[],
  scopeHint?: string,
): ModuleAccessRow[] {
  const navLike = [
    "WEBSITE",
    "TRAININGS",
    "WOCHENPLAN",
    "NEWS",
    "TASKS",
    "DOCUMENTS",
    "PEOPLE",
    "FACILITIES",
    "USERS",
    "ROLES",
  ];

  const byModule = new Map(groups.map((g) => [g.module, g]));

  return navLike.map((moduleKey) => {
    const group = byModule.get(moduleKey);
    const label = moduleLabel(moduleKey);
    if (!group || !group.hasAccess) {
      return { moduleLabel: label, level: "Kein Zugriff" as const };
    }
    const isAdmin = ADMIN_MODULES.has(moduleKey);
    const level: ModuleAccessLevel = isAdmin
      ? "Vollzugriff"
      : scopeHint
        ? "Teambezogen"
        : "Bearbeiten";
    return {
      moduleLabel: label,
      level,
      scopeHint: scopeHint && !isAdmin ? scopeHint : undefined,
    };
  });
}
