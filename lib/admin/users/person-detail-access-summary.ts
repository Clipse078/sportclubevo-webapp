import type { PersonNavEffectiveAccessSection } from "@/lib/admin/users/person-nav-effective-access";

export function buildPersonDetailAccessOverviewLine(
  sections: readonly PersonNavEffectiveAccessSection[],
): string {
  if (sections.length === 0) {
    return "Keine freigegebenen Produktbereiche aus Rollen und Zuständigkeiten.";
  }

  const moduleLabels = Array.from(
    new Set(sections.flatMap((section) => section.modules).filter(Boolean)),
  );
  const preview =
    moduleLabels.length <= 4
      ? moduleLabels.join(" · ")
      : `${moduleLabels.slice(0, 3).join(" · ")} · +${moduleLabels.length - 3} weitere`;

  const itemCount = sections.reduce((sum, section) => sum + section.items.length, 0);
  return `${sections.length} Produktbereich${sections.length === 1 ? "" : "e"}, ${itemCount} Modul${itemCount === 1 ? "" : "e"} — ${preview}`;
}
