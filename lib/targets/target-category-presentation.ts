import type { TargetCategory } from "@prisma/client";

/**
 * User-facing labels for stored Target.category enum values (values unchanged in DB/API).
 */
export const TARGET_CATEGORY_LABELS: Record<TargetCategory, string> = {
  SPORTLICHE_ENTWICKLUNG: "Sportliche Entwicklung",
  MITGLIEDERWACHSTUM: "Mitgliederwachstum",
  FINANZEN: "Finanzen & Infrastruktur",
  AUSBILDUNG: "Ausbildung",
  MEDIEN_SOZIALES: "Medien & Soziales",
  GOVERNANCE: "Vereinsführung",
};

export function labelTargetCategory(category: string | TargetCategory): string {
  return TARGET_CATEGORY_LABELS[category as TargetCategory] ?? category;
}