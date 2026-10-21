import type { PlanningOperationalSummaryItem } from "@/components/admin/planning/PlanningManagementOperationalSummary";

export type TrainingOperationalKpis = {
  active: number;
  inactive: number;
  archived: number;
  total: number;
};

export function buildTrainingOperationalSummaryItems(
  kpis: TrainingOperationalKpis,
  options: {
    archiveToggleHref: string;
    archivedView: boolean;
  },
): PlanningOperationalSummaryItem[] {
  const items: PlanningOperationalSummaryItem[] = [
    {
      key: "active",
      label: "Aktiv",
      value: kpis.active,
      hint: "laufende Serien",
      tone: "sky",
      "data-testid": "training-kpi-active",
    },
  ];

  if (kpis.inactive > 0) {
    items.push({
      key: "inactive",
      label: "Inaktiv",
      value: kpis.inactive,
      hint: "pausierte Serien",
      tone: "amber",
      "data-testid": "training-kpi-inactive",
    });
  }

  if (kpis.archived > 0 || options.archivedView) {
    items.push({
      key: "archived",
      label: "Archiv",
      value: kpis.archived,
      hint: "archivierte Serien",
      href: options.archiveToggleHref,
      active: options.archivedView,
      tone: "muted",
      "data-testid": "training-kpi-archived",
    });
  }

  const duplicateTotal =
    kpis.active === kpis.total && kpis.inactive === 0 && kpis.archived === 0;
  if (!duplicateTotal && kpis.total !== kpis.active) {
    items.push({
      key: "total",
      label: "Total",
      value: kpis.total,
      hint: "Trainings im Tenant",
      tone: "emerald",
      "data-testid": "training-kpi-total",
    });
  }

  return items;
}
