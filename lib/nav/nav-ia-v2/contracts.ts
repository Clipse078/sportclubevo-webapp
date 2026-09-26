/**
 * SCE-NAV-IA-V2-01 — navigation contracts (V2-02 applies club L1 taxonomy via app-navigation-domains).
 */

export const NAV_IA_V2_DEPTH_CONTRACT = {
  L1:
    "Verantwortungsdomäne (Dashboard, Planung, Kommunikation, Club, Publishing). Max. fünf sichtbare Club-L1-Domänen in Row 1.",
  L2:
    "Wesentliches Ziel / Verantwortungsbereich innerhalb der Domäne (z. B. Club → People & Teams). Erscheint in Header Row 2, wenn die Domäne aktiv ist.",
  L3:
    "Lokale Navigation innerhalb eines Moduls (Tabs, CMS-Unterseiten, Admin-Kindziele). Nur wenn der aktive Bereich echte lokale Struktur hat — keine globale dritte Zeile.",
  APP_EXPLORER:
    "Vollständige, berechtigungsgefilterte Entdeckung; gleiche L1-Taxonomie wie Header; tiefe/seltene Ziele ohne dauerhaften Header-Platz.",
  QUICK_ACCESS:
    "Persönliche Pins; ändert nie canonical parent/domain; Metadaten ausschliesslich aus nav-config / Ziel-Matrix; Berechtigungen bleiben aktiv.",
  DASHBOARD:
    "Persönliches Betriebs-Home (Programm, Kalender, Aufmerksamkeit, Aufgaben, Schnellzugriff) — kein Sammelbecken für Club-Module.",
} as const;

export const NAV_IA_V2_HEADER_CONTRACT = {
  ROW_1:
    "Marke/Tenant · L1-Domänen (permission-aware) · globale Utilities (Benachrichtigungen, Konto, Explorer/Hamburger). Owner: AppShellNavigation.tsx, AppTopNav.tsx.",
  ROW_2:
    "Kontextuelle L2-Ziele der aktiven Domäne (domainSecondaryItems). Owner: resolveDomainSecondaryNavItems + AppShellNavigation.",
  ROW_3:
    "Nur moduleLocalChildren wenn activeDestination Kinder hat und Domäne kein Single-Hub ist (Ausnahme: Planung hub → Kinder in Row 2). Owner: resolveModuleLocalNavItems.",
  MIGRATION_IMPACT:
    "V2-02 ersetzt CLUB_NAV_ITEM_TO_DOMAIN-Mapping; fügt publishing-L1 hinzu; entfernt organisation-L1; Row-2-Inhalte werden aus Ziel-L2-Gruppen abgeleitet statt verstreuter Module.",
} as const;

export const NAV_IA_V2_ACTIVE_STATE_CONTRACT = {
  MODEL:
    "resolveActiveAppNavigation(pathname, model) bleibt zentral; V2 erweitert Domain-IDs um publishing und mappt Organisation unter club.",
  DEEP_ROUTE_SUPPORT:
    "Präfix-Match auf destination.href und module-local children (z. B. /dashboard/teams/123 → L1 club, L2 teams, lokaler Team-Kontext via Seiten-Nav).",
  SCATTERED_ROUTE_HACKS:
    "Keine neuen pathname-Switches in Feature-Komponenten; Seiten-lokale Nav (TeamCockpitNav, BillingWorkspaceNav) bleibt L3 unterhalb des canonical Moduls.",
} as const;

export const NAV_IA_V2_PERMISSION_CONTRACT = {
  MODEL:
    "getVisibleNavSections → buildAppNavigationModelForUser; OR-Semantik pro NavItem/Child; navContexts club|platform; personalActionsNavFallback für Aufgaben.",
  ZERO_CHILD_DOMAIN:
    "Domäne ohne autorisierte Kinder wird ausgeblendet, ausser die Domäne selbst hat ein autorisiertes Default-Destination (Dashboard).",
  CLUB_ADMIN_COMPLETENESS:
    "Vollständiger Permission-Key-Satz muss 0 orphans liefern (auditNavigationCompleteness); V2 darf diese Invariante nicht brechen.",
} as const;

export const NAV_IA_V2_APP_EXPLORER_CONTRACT = {
  TAXONOMY:
    "buildExplorerSearchIndex folgt model.domains; V2 domains spiegeln L1 (inkl. publishing); keine parallele Taxonomie.",
  SEARCH:
    "filterExplorerSearchIndex über Label/Domain/Modul; moduleNavKey für SCE-Icons.",
  COMPLETE_DISCOVERY:
    "Jeder canonical leaf muss als module- oder child-Hit indexierbar sein; Domänen-Mehr-Pfad für overflow L1.",
} as const;

export const NAV_IA_V2_MOBILE_CONTRACT = {
  PORTABLE_METADATA:
    "NavigationDomain { id, labelKey, fallbackLabel, priority, sortOrder, defaultDestination, destinations[] } + NavItemChild für L3.",
  RESPONSIVE:
    "selectMobileBottomDomains(max 3) + GlobalNavDrawer auf allen Breakpoints; keine Desktop-only Labels in Domain-Definitionen.",
} as const;

export const NAV_IA_V2_IMPLEMENTATION_OWNERS = [
  {
    file: "lib/nav/nav-config.ts",
    responsibility: "Canonical routes, labels, permissions, children",
    change: "Optional label tweaks only; routes stable in V2-02",
    risk: "high",
    tests: "lib/nav/__tests__/nav-config.test.ts",
  },
  {
    file: "lib/nav/app-navigation-domains.ts",
    responsibility: "L1 grouping CLUB_NAV_ITEM_TO_DOMAIN",
    change: "Add publishing L1; fold organisation into club; remap website/infoboard",
    risk: "high",
    tests: "lib/nav/__tests__/sce-visual-03r1-navigation-hierarchy.test.ts",
  },
  {
    file: "lib/nav/app-navigation-model.ts",
    responsibility: "Model build, active state, completeness audit",
    change: "Domain id union + secondary row rules for publishing/club L2",
    risk: "high",
    tests: "lib/nav/__tests__/sce-visual-03r2-navigation-completeness.test.ts",
  },
  {
    file: "lib/nav/app-navigation-explorer.ts",
    responsibility: "Explorer module tree + search index",
    change: "Consume new domains; optional L2 section headers in drawer",
    risk: "medium",
    tests: "lib/nav/__tests__/sce-visual-06-app-navigation-explorer.test.ts",
  },
  {
    file: "components/admin/layout/AppShellNavigation.tsx",
    responsibility: "Header rows, overflow, mobile bottom nav",
    change: "L1 labels/order; Row 2 grouping labels",
    risk: "high",
    tests: "components/admin/layout/__tests__/AppShellNavigation*.test.tsx",
  },
  {
    file: "components/admin/layout/GlobalNavDrawer.tsx",
    responsibility: "Hamburger explorer UI",
    change: "Domain sections for publishing; club L2 group headings",
    risk: "medium",
    tests: "AppShellNavigation.explorer*.test.tsx",
  },
  {
    file: "lib/nav/nav-destination-sce-icons.ts",
    responsibility: "Destination → SCE icon",
    change: "Add publishing L1 domain icon key mapping only (reuse publish master)",
    risk: "low",
    tests: "lib/nav/__tests__/sce-icons-*.test.ts",
  },
  {
    file: "components/ui/dashboard/PersonalQuickAccess.tsx",
    responsibility: "Pinned destinations",
    change: "None for IA parent; verify stable keys post-domain remap",
    risk: "low",
    tests: "PersonalQuickAccess.sce-icons-02.test.tsx",
  },
  {
    file: "lib/permissions/get-visible-admin-nav.ts",
    responsibility: "Legacy flat adapter",
    change: "Stays derived from nav-config",
    risk: "low",
    tests: "rperm-05-administration-nav.test.ts",
  },
] as const;

export const NAV_IA_V2_PHASE_PLAN = [
  {
    id: "NAV-IA-V2-02",
    title: "Canonical taxonomy + navigation model",
    scope:
      "app-navigation-domains, domain ids (publishing), CLUB_NAV_ITEM_TO_DOMAIN, target matrix wiring, completeness tests",
  },
  {
    id: "NAV-IA-V2-03",
    title: "Header + contextual navigation migration",
    scope: "AppShellNavigation Row 1/2, L2 group labels, active state for publishing/club",
  },
  {
    id: "NAV-IA-V2-04",
    title: "App Explorer + responsive/mobile metadata",
    scope: "GlobalNavDrawer grouping, explorer search labels, mobile bottom nav ordering",
  },
  {
    id: "NAV-IA-V2-05",
    title: "Completeness, UX hardening & closure",
    scope: "Label pass, club-admin zero-orphan gate, documentation closure",
  },
] as const;
