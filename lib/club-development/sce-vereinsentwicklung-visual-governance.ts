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
  "app/(admin)/vereinsleitung/meetings/page.tsx",
  "components/admin/club-development/VorhabenAufgabenWorkspace.tsx",
  "components/admin/club-development/VorhabenUndUmsetzungWorkspaceClient.tsx",
  "components/admin/club-development/UmsetzungsplanungWorkspace.tsx",
  "components/admin/club-development/UmsetzungsplanungPhaseAssignedTasksPanel.tsx",
  "components/admin/club-development/InitiativeBacklogWorkspace.tsx",
  "components/admin/initiatives/CreateInitiativeWorkspaceCollapsibleCard.tsx",
  "components/admin/club-development/StrategyAuthoringPanel.tsx",
  "components/admin/club-development/ZieleWorkspacePanel.tsx",
  "components/admin/vereinsleitung/VereinsleitungMeetingsWorkspaceClient.tsx",
  "components/admin/meetings/workspace/MeetingWorkspace.tsx",
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
    if (!src.includes("InitiativeBacklogWorkspace") || !src.includes("VorhabenAufgabenWorkspace")) {
      findings.push({
        file: normalized,
        reason: "Vorhaben view must render standard or Prioritäten workspace.",
      });
    }
  }

  if (normalized === "components/admin/initiatives/CreateInitiativeWorkspaceCollapsibleCard.tsx") {
    if (src.includes("max-w-xl") || src.includes("justify-end")) {
      findings.push({
        file: normalized,
        reason: "Vorhaben inline create shell must span full content width.",
      });
    }
    if (!src.includes("SCE_VORHABEN_INLINE_CREATE_SHELL_CLASS")) {
      findings.push({
        file: normalized,
        reason: "Vorhaben inline create must use canonical full-width shell marker.",
      });
    }
  }

  if (normalized === "components/admin/club-development/InitiativeBacklogWorkspace.tsx") {
    if (!src.includes("CreateInitiativeWorkspaceCollapsibleCard")) {
      findings.push({
        file: normalized,
        reason: "Prioritäten workspace must use shared Vorhaben inline create card.",
      });
    }
    if (src.includes("InitiativeBacklogCreateCard") && !src.includes("deprecated")) {
      findings.push({
        file: normalized,
        reason: "Prioritäten workspace must not use a separate create form implementation.",
      });
    }
  }

  if (normalized === "app/(admin)/vereinsleitung/meetings/page.tsx") {
    if (!src.includes("CD_MEETINGS_WORKSPACE_COPY.pageSubtitle")) {
      findings.push({
        file: normalized,
        reason: "Sitzungen list must use canonical workspace subtitle copy key.",
      });
    }
    if (!src.includes("VereinsleitungMeetingsWorkspaceClient")) {
      findings.push({
        file: normalized,
        reason: "Sitzungen list must render migrated workspace client.",
      });
    }
  }

  if (normalized === "components/admin/vereinsleitung/VereinsleitungMeetingsWorkspaceClient.tsx") {
    if (!src.includes(SCE_VEREINSENTWICKLUNG_VISUAL_SURFACE_MARKERS.sectionShell)) {
      findings.push({
        file: normalized,
        reason: "Sitzungen list must use SceClubDevelopmentSectionShell.",
      });
    }
    if (!src.includes("CreateMeetingInlineCollapsibleCard")) {
      findings.push({
        file: normalized,
        reason: "Neue Sitzung must use inline collapsible create card.",
      });
    }
  }

  if (normalized === "components/admin/club-development/StrategyAuthoringPanel.tsx") {
    if (!src.includes(SCE_VEREINSENTWICKLUNG_VISUAL_SURFACE_MARKERS.sectionShell)) {
      findings.push({
        file: normalized,
        reason: "Strategie & Ziele authoring must use section shells.",
      });
    }
    if (src.includes("focusHint")) {
      findings.push({
        file: normalized,
        reason: "Schwerpunkte section must not repeat redundant focus hint copy.",
      });
    }
  }

  if (normalized === "components/admin/meetings/workspace/MeetingWorkspace.tsx") {
    if (!src.includes(SCE_VEREINSENTWICKLUNG_VISUAL_SURFACE_MARKERS.sectionShell)) {
      findings.push({
        file: normalized,
        reason: "Meeting workspace must wrap summary in section shell.",
      });
    }
  }

  if (normalized === "components/admin/club-development/VorhabenAufgabenWorkspace.tsx") {
    if (src.includes("Wurzel-Aufgaben")) {
      findings.push({
        file: normalized,
        reason: 'Vorhaben surfaces must label tasks as "Aufgaben", not Wurzel-Aufgaben.',
      });
    }
  }

  if (normalized === "components/admin/club-development/UmsetzungsplanungWorkspace.tsx") {
    if (!src.includes("UmsetzungsplanungCollapsibleSection")) {
      findings.push({
        file: normalized,
        reason: "Umsetzungsplanung workspace sections must use shared collapsible section chrome.",
      });
    }
    if (src.includes("SceClubDevelopmentEmptyState")) {
      findings.push({
        file: normalized,
        reason: "Umsetzungsplanung workspace must use compact inline empty messages.",
      });
    }
    if (!src.includes("countUmsetzungsplanungBuckets")) {
      findings.push({
        file: normalized,
        reason: "Section empty states must follow authorised sprint bucket counts, not assumed placeholders.",
      });
    }
  }

  if (normalized === "components/admin/club-development/UmsetzungsplanungPhaseAssignedTasksPanel.tsx") {
    if (src.includes("SceClubDevelopmentEmptyState")) {
      findings.push({
        file: normalized,
        reason: "Phase task panel must distinguish empty vs loading vs error with inline copy.",
      });
    }
    if (!src.includes("groupAssignedSprintBoardCards")) {
      findings.push({
        file: normalized,
        reason: "Assigned phase tasks must group by Vorhaben and status in the workspace.",
      });
    }
  }

  return findings;
}