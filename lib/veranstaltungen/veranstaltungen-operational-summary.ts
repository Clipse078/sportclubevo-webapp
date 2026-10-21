import type { PlanningOperationalSummaryItem } from "@/components/admin/planning/PlanningManagementOperationalSummary";
import type { VeranstaltungenTab } from "@/lib/veranstaltungen/navigation";

export type VeranstaltungenOperationalKpis = {
  upcoming: number;
  past: number;
  total: number;
  uniqueVenues: number;
};

export function buildVeranstaltungenOperationalSummaryItems(
  kpis: VeranstaltungenOperationalKpis,
  tab: VeranstaltungenTab,
  hrefForTab: (tab: VeranstaltungenTab) => string,
): PlanningOperationalSummaryItem[] {
  const items: PlanningOperationalSummaryItem[] = [
    {
      key: "upcoming",
      label: "Bevorstehend",
      value: kpis.upcoming,
      href: hrefForTab("BEVORSTEHEND"),
      active: tab === "BEVORSTEHEND",
      tone: "sky",
      "data-testid": "veranstaltungen-kpi-upcoming",
    },
    {
      key: "past",
      label: "Vergangen",
      value: kpis.past,
      href: hrefForTab("VERGANGEN"),
      active: tab === "VERGANGEN",
      tone: "muted",
      "data-testid": "veranstaltungen-kpi-past",
    },
  ];

  if (kpis.uniqueVenues > 1) {
    items.push({
      key: "venues",
      label: "Orte",
      value: kpis.uniqueVenues,
      hint: "Verschiedene Veranstaltungsorte",
      tone: "muted",
      "data-testid": "veranstaltungen-kpi-venues",
    });
  }

  return items;
}
