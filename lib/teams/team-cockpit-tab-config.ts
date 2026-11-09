import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type TeamCockpitTabId =
  | "uebersicht"
  | "programm"
  | "resultate"
  | "rangliste"
  | "kader"
  | "trainerteam"
  | "kommunikation"
  | "dokumente"
  | "administration"
  | "spiele"
  | "anwesenheit"
  | "teilnahmen";

const TEAM_COCKPIT_SEGMENT_ORDER: Array<{ key: TeamCockpitTabId; suffix: string }> = [
  { key: "programm", suffix: "/programm" },
  { key: "resultate", suffix: "/resultate" },
  { key: "rangliste", suffix: "/rangliste" },
  { key: "kader", suffix: "/kader" },
  { key: "trainerteam", suffix: "/trainerteam" },
  { key: "kommunikation", suffix: "/kommunikation" },
  { key: "dokumente", suffix: "/dokumente" },
  { key: "administration", suffix: "/administration" },
  { key: "spiele", suffix: "/spiele" },
  { key: "anwesenheit", suffix: "/anwesenheit" },
  { key: "teilnahmen", suffix: "/teilnahmen" },
];

export function buildTeamBasePath(teamId: string): string {
  return `/dashboard/teams/${teamId}`;
}

function buildTeamTabRoutes(teamId: string): Record<TeamCockpitTabId, string> {
  const base = buildTeamBasePath(teamId);
  const routes = {
    uebersicht: base,
    programm: `${base}/programm`,
    resultate: `${base}/resultate`,
    rangliste: `${base}/rangliste`,
    kader: `${base}/kader`,
    trainerteam: `${base}/trainerteam`,
    kommunikation: `${base}/kommunikation`,
    dokumente: `${base}/dokumente`,
    administration: `${base}/administration`,
    spiele: `${base}/spiele`,
    anwesenheit: `${base}/anwesenheit`,
    teilnahmen: `${base}/teilnahmen`,
  } satisfies Record<TeamCockpitTabId, string>;
  return routes;
}

export function buildTeamCockpitTabNavigationConfig(input: {
  teamId: string;
  showAdministration: boolean;
}): ContextTabNavigationConfig<TeamCockpitTabId> {
  const tabRoutes = buildTeamTabRoutes(input.teamId);
  const teamBase = buildTeamBasePath(input.teamId);

  const tabs: ContextTabNavigationConfig<TeamCockpitTabId>["tabs"] = [
    { key: "uebersicht", label: "Übersicht", placement: "primary" },
    { key: "programm", label: "Programm", placement: "primary" },
    { key: "resultate", label: "Resultate", placement: "primary" },
    { key: "rangliste", label: "Rangliste", placement: "primary" },
    { key: "kader", label: "Kader", placement: "primary" },
    { key: "trainerteam", label: "Trainerteam", placement: "primary" },
    { key: "kommunikation", label: "Kommunikation", placement: "primary" },
    { key: "dokumente", label: "Dokumente", placement: "primary" },
  ];

  if (input.showAdministration) {
    tabs.push({
      key: "administration",
      label: "Administration",
      placement: "primary",
    });
  }

  tabs.push(
    { key: "spiele", label: "Nächste Spiele", placement: "overflow" },
    { key: "anwesenheit", label: "Anwesenheit", placement: "overflow" },
    { key: "teilnahmen", label: "Teilnahmen", placement: "overflow" },
  );

  return {
    contextKind: "TEAM_COCKPIT",
    defaultTab: "uebersicht",
    tabRoutes,
    resolveActiveTabFromPathname: (pathname, visibleKeys) => {
      const normalized =
        pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

      if (normalized === teamBase) {
        return visibleKeys.includes("uebersicht") ? "uebersicht" : null;
      }

      if (!normalized.startsWith(`${teamBase}/`)) {
        return null;
      }

      const suffix = normalized.slice(teamBase.length);
      const match = TEAM_COCKPIT_SEGMENT_ORDER.find((entry) => entry.suffix === suffix);
      if (match && visibleKeys.includes(match.key)) {
        return match.key;
      }

      const nested = TEAM_COCKPIT_SEGMENT_ORDER.find(
        (entry) => suffix.startsWith(`${entry.suffix}/`),
      );
      if (nested && visibleKeys.includes(nested.key)) {
        return nested.key;
      }

      return visibleKeys.includes("uebersicht") ? "uebersicht" : null;
    },
    tabs,
  };
}

type TeamCockpitTabDef = {
  key: string;
  label: string;
  href: string;
  exact?: boolean;
};

/** Path-segment active state helper (unit tests). */
export function isTabActive(pathname: string, basePath: string, tab: TeamCockpitTabDef): boolean {
  const href = `${basePath}${tab.href}`;

  if (tab.exact) {
    return pathname === basePath || pathname === `${basePath}/`;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
