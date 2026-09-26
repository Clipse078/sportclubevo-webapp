/**
 * Domain concepts that still lack an approved SCE master (artwork freeze).
 * Inventory rows here are excluded from UNRESOLVED_DOMAIN_WITH_EXISTING_MASTER checks.
 */

export type MissingSceSemantic = {
  concept: string;
  currentIcon: string;
  files: string[];
  surfaces: string[];
  frequency: number;
  recommendedMaster: string;
  reason: string;
};

export const MISSING_SCE_SEMANTICS: MissingSceSemantic[] = [
  {
    concept: "competition",
    currentIcon: "Lucide:Trophy",
    files: ["lib/nav/nav-config.ts"],
    surfaces: ["Navigation — Wettkämpfe", "Organisation — competitions"],
    frequency: 2,
    recommendedMaster: "competition",
    reason:
      "Wettkämpfe covers competition lifecycle and sync, not league standings; standings master is semantically incorrect.",
  },
  {
    concept: "page",
    currentIcon: "Lucide:FileText",
    files: ["app/(admin)/dashboard/website/page.tsx", "lib/cms/sections.ts"],
    surfaces: ["CMS KPI — Seiten", "CMS Schnellzugriff — Seiten", "CMS feature — pages"],
    frequency: 4,
    recommendedMaster: "page",
    reason: "Static website pages are not generic documents or forms.",
  },
  {
    concept: "media-library",
    currentIcon: "Lucide:ImageIcon",
    files: ["app/(admin)/dashboard/website/page.tsx"],
    surfaces: ["CMS KPI — Medien", "CMS Schnellzugriff — Mediathek"],
    frequency: 3,
    recommendedMaster: "media-library",
    reason: "Mediathek is asset management, not document workspace semantics.",
  },
  {
    concept: "block-library",
    currentIcon: "Lucide:Blocks",
    files: ["app/(admin)/dashboard/website/page.tsx"],
    surfaces: ["CMS Schnellzugriff — Block-Bibliothek"],
    frequency: 1,
    recommendedMaster: "block-library",
    reason: "Reusable page blocks are not form or document semantics.",
  },
  {
    concept: "website-navigation-structure",
    currentIcon: "Lucide:Menu",
    files: ["app/(admin)/dashboard/website/page.tsx"],
    surfaces: ["CMS Schnellzugriff — Navigation"],
    frequency: 1,
    recommendedMaster: "website-navigation",
    reason: "Menu tree configuration is narrower than the website module icon.",
  },
  {
    concept: "homepage-layout",
    currentIcon: "Lucide:LayoutTemplate",
    files: ["app/(admin)/dashboard/website/page.tsx"],
    surfaces: ["CMS Schnellzugriff — Homepage Builder"],
    frequency: 1,
    recommendedMaster: "homepage-builder",
    reason: "Homepage section builder is not identical to generic website presence.",
  },
  {
    concept: "goal",
    currentIcon: "Lucide:Target",
    files: ["app/(admin)/vereinsleitung/club-entwicklung/page.tsx"],
    surfaces: ["Club Entwicklung — Ziele"],
    frequency: 2,
    recommendedMaster: "goal",
    reason: "Strategic club development goals have no approved master.",
  },
  {
    concept: "initiative",
    currentIcon: "Lucide:Lightbulb",
    files: ["app/(admin)/vereinsleitung/club-entwicklung/page.tsx"],
    surfaces: ["Club Entwicklung — Initiativen"],
    frequency: 2,
    recommendedMaster: "initiative",
    reason: "Governance initiatives are distinct from workflow or tasks.",
  },
  {
    concept: "material-inventory",
    currentIcon: "Lucide:Package",
    files: ["lib/nav/nav-config.ts"],
    surfaces: ["Club — Material & Inventar navigation"],
    frequency: 1,
    recommendedMaster: "material-inventory",
    reason: "Inventory/material module has no approved master.",
  },
  {
    concept: "discipline-incident",
    currentIcon: "Lucide:ShieldAlert",
    files: ["lib/nav/nav-config.ts"],
    surfaces: ["Governance — Vorfälle & Disziplin"],
    frequency: 1,
    recommendedMaster: "discipline-incident",
    reason: "Disciplinary incidents are not attention or audit semantics.",
  },
  {
    concept: "target-group",
    currentIcon: "Lucide:Users",
    files: ["lib/nav/nav-config.ts"],
    surfaces: ["Organisation — Zielgruppen navigation"],
    frequency: 1,
    recommendedMaster: "target-group",
    reason: "Audience/target groups are not generic people directory semantics.",
  },
  {
    concept: "waiting-list",
    currentIcon: "Lucide:Hourglass",
    files: ["lib/nav/nav-config.ts"],
    surfaces: ["Anmeldungen — Warteliste"],
    frequency: 1,
    recommendedMaster: "waiting-list",
    reason: "Queue/waiting list is narrower than invitation.",
  },
];

export function missingSceSemanticConcepts(): Set<string> {
  return new Set(MISSING_SCE_SEMANTICS.map((row) => row.concept));
}
