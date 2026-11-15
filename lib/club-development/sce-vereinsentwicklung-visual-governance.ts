/**
 * Vereinsentwicklung visual standard — static checks (ClubDevelopmentOverview reference).
 */

export const SCE_VEREINSENTWICKLUNG_VISUAL_SURFACE_MARKERS = {
  sectionShell: "SceClubDevelopmentSectionShell",
  emptyState: "SceClubDevelopmentEmptyState",
  surfaceStyles: "sce-club-development-surface-styles",
} as const;

/** User-facing copy must not leak implementation language on migrated surfaces. */
export const SCE_VEREINSENTWICKLUNG_BANNED_USER_COPY = [
  "CommunicationTemplates",
  "gefilterte Lens",
  "kein Ersatz für",
  "Root-Aufgaben",
  "Wurzel-Aufgabe",
  "Tenant-weit",
  "Verfügbar",
] as const;

export const SCE_VEREINSENTWICKLUNG_COPY_GOVERNANCE_PATHS = [
  "lib/club-development/product-copy.ts",
  "components/admin/club-development/ClubDevelopmentOverview.tsx",
  "components/admin/vereinsleitung/GovernanceStaleCard.tsx",
] as const;

export const SCE_VEREINSENTWICKLUNG_WORKSPACE_GOVERNANCE_PATHS = [
  "app/(admin)/vereinsleitung/vorhaben-und-umsetzung/page.tsx",
  "components/admin/club-development/VorhabenAufgabenWorkspace.tsx",
  "components/admin/club-development/VorhabenUndUmsetzungWorkspaceClient.tsx",
] as const;

export type VereinsentwicklungVisualGovernanceFinding = {
  file: string;
  reason: string;
};

export function collectVereinsentwicklungCopyViolations(
  file: string,
  src: string,
): VereinsentwicklungVisualGovernanceFinding[] {
  const normalized = file.replace(/\\/g, "/");
  if (
    !SCE_VEREINSENTWICKLUNG_COPY_GOVERNANCE_PATHS.includes(
      normalized as (typeof SCE_VEREINSENTWICKLUNG_COPY_GOVERNANCE_PATHS)[number],
    )
  ) {
    return [];
  }
  const findings: VereinsentwicklungVisualGovernanceFinding[] = [];
  for (const term of SCE_VEREINSENTWICKLUNG_BANNED_USER_COPY) {
    if (src.includes(term)) {
      findings.push({
        file: normalized,
        reason: `Banned implementation or redundant status copy: "${term}"`,
      });
    }
  }
  return findings;
}

export function collectVereinsentwicklungWorkspaceViolations(
  file: string,
  src: string,
): VereinsentwicklungVisualGovernanceFinding[] {
  const normalized = file.replace(/\\/g, "/");
  const findings: VereinsentwicklungVisualGovernanceFinding[] = [];

  if (normalized === "components/admin/club-development/VorhabenAufgabenWorkspace.tsx") {
    if (src.includes("NavShortcut")) {
      findings.push({
        file: normalized,
        reason: "Vorhaben & Umsetzung must not duplicate local views with shortcut cards.",
      });
    }
    if (!src.includes('variant: VorhabenAufgabenWorkspaceVariant') && !src.includes("data-variant")) {
      findings.push({
        file: normalized,
        reason: "VorhabenAufgabenWorkspace must expose vorhaben vs aufgaben variants.",
      });
    }
    if (src.includes("CD_VORHABEN_WORKSPACE_COPY.intro")) {
      findings.push({
        file: normalized,
        reason: "Duplicate page intro — use ListPagePattern description only.",
      });
    }
  }

  if (normalized === "app/(admin)/vereinsleitung/vorhaben-und-umsetzung/page.tsx") {
    if (!src.includes("CD_VORHABEN_UMSETZUNG_WORKSPACE_COPY.pageSubtitle")) {
      findings.push({
        file: normalized,
        reason: "Vorhaben & Umsetzung page must use canonical single subtitle copy key.",
      });
    }
  }

  if (normalized === "components/admin/club-development/VorhabenUndUmsetzungWorkspaceClient.tsx") {
    if (!src.includes("VorhabenPrioritaetenControl")) {
      findings.push({
        file: normalized,
        reason: "Prioritäten control must remain visible within Vorhaben view.",
      });
    }
  }

  return findings;
}