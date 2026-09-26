import type { SceIconRegistryName } from "@/components/design-system/icons/registry";

/** Future-module capability cards — semantic SCE mapping by stable capability key. */
export const MODULE_CAPABILITY_SCE_ICON: Record<string, SceIconRegistryName> = {
  "mitglieder.interessenten": "invitation",
  "mitglieder.antraege": "invitation",
  "mitglieder.aktiv": "member",
  "mitglieder.zuordnung": "team-management",
  "mitglieder.austritt": "member",
  "mitglieder.dokumente": "documents",
  "aufgaben.meine": "tasks",
  "aufgaben.team": "tasks",
  "aufgaben.faelligkeiten": "tasks",
  "aufgaben.verantwortliche": "assignment",
  "aufgaben.aus-anmeldungen": "requirements",
  "aufgaben.aus-planung": "planning",
  "aufgaben.aus-meetings": "committee-board",
  "aufgaben.erledigt": "archive",
  "helfer.einsatzplanung": "volunteer",
  "helfer.bewerbungen": "volunteer",
  "helfer.einsatzdetail": "volunteer",
  "helfer.kommunikation": "communication",
  "helfer.reporting": "report",
};

export function getModuleCapabilitySceIconName(key: string): SceIconRegistryName | null {
  return MODULE_CAPABILITY_SCE_ICON[key] ?? null;
}
