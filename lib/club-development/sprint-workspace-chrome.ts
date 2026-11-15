import { CD_NAV_COPY, CD_SPRINT_WORKSPACE_COPY } from "@/lib/club-development/product-copy";

export const CD_SPRINT_BREADCRUMB_COPY = {
  vereinsentwicklung: "Vereinsentwicklung",
  vorhabenUndUmsetzung: "Vorhaben & Umsetzung",
  umsetzungsphasen: "Umsetzungsphasen",
} as const;

export type DevelopmentSprintBreadcrumbTab = "planung" | "board" | "rueckblick";

export type SprintBreadcrumbItem = { label: string; href?: string };

const TAB_LABELS: Record<DevelopmentSprintBreadcrumbTab, string> = {
  planung: CD_SPRINT_WORKSPACE_COPY.tabPlanning,
  board: CD_SPRINT_WORKSPACE_COPY.tabTaskBoard,
  rueckblick: CD_SPRINT_WORKSPACE_COPY.tabReview,
};

export function buildDevelopmentSprintBreadcrumbs(
  sprintSlug: string,
  sprintTitle: string,
  activeTab: DevelopmentSprintBreadcrumbTab = "planung",
): SprintBreadcrumbItem[] {
  const phaseHref = `/vereinsleitung/sprints/${encodeURIComponent(sprintSlug)}`;
  const crumbs: SprintBreadcrumbItem[] = [
    {
      label: CD_SPRINT_BREADCRUMB_COPY.vereinsentwicklung,
      href: "/vereinsleitung/club-entwicklung",
    },
    {
      label: CD_SPRINT_BREADCRUMB_COPY.vorhabenUndUmsetzung,
      href: "/vereinsleitung/vorhaben-und-umsetzung",
    },
    {
      label: CD_SPRINT_BREADCRUMB_COPY.umsetzungsphasen,
      href: "/vereinsleitung/vorhaben-und-umsetzung?ansicht=umsetzungsphasen",
    },
    { label: sprintTitle, href: phaseHref },
  ];
  if (activeTab !== "planung") {
    crumbs.push({ label: TAB_LABELS[activeTab] });
  }
  return crumbs;
}