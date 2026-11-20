/**
 * SCE contextual create/link flows — inline collapsible rule (PKG-05, SCE-UX-01).
 * Supersedes modal-first guidance for parent-context creation on Ziel and Strategie surfaces.
 */

/** Entry points migrated to inline collapsible cards (governance-enforced). */
export const SCE_CONTEXTUAL_CREATE_INLINE_ENTRY_PATHS = [
  "components/admin/targets/TargetInitiativeLinksSection.tsx",
  "components/admin/club-development/StrategienWorkspaceListPanel.tsx",
  "components/admin/club-development/StrategyAuthoringPanel.tsx",
  "components/admin/club-development/ZieleWorkspacePanel.tsx",
  "components/admin/club-development/VorhabenAufgabenWorkspace.tsx",
  "components/admin/club-development/InitiativeBacklogWorkspace.tsx",
] as const;

export const SCE_CONTEXTUAL_CREATE_INLINE_CARD_MARKERS = [
  "CreateInitiativeContextualCollapsibleCard",
  "CreateTargetContextualCollapsibleCard",
  "CreateTargetWorkspaceCollapsibleCard",
  "CreateInitiativeWorkspaceCollapsibleCard",
  "CreateStrategieWorkspaceCollapsibleCard",
  "VereinsentwicklungAufgabeWorkspaceCreateCard",
  "data-sce-contextual-create-flow=\"inline-collapsible\"",
] as const;

export const SCE_CONTEXTUAL_CREATE_INLINE_SHELL =
  "SceClubDevelopmentContextualCreateCollapsibleShell" as const;

/**
 * Contextual creation/editing overlays not yet migrated (inventory only — no claim of app-wide conversion).
 */
export const SCE_CONTEXTUAL_CREATE_OVERLAY_INVENTORY = [
  {
    id: "create-target-list-modal",
    surface: "Legacy Ziele list routes",
    component: "CreateTargetComposerDialog",
    trigger: "CreateTargetTrigger",
    notes: "Consolidated Strategie & Ziele workspace uses CreateTargetWorkspaceCollapsibleCard.",
  },
  {
    id: "create-initiative-list-page",
    surface: "Vorhaben list",
    component: "CreateInitiativeTrigger",
    trigger: "href /vereinsleitung/initiativen/new",
    notes: "Deep-link full-page create — not contextual overlay.",
  },
  {
    id: "zielgruppe-create-composer",
    surface: "Kommunikation Zielgruppen",
    component: "ZielgruppeCreateComposerDialog",
    trigger: "ZielgruppeCreateTrigger",
    notes: "Modal workspace composer — candidate for inline migration.",
  },
  {
    id: "meeting-initiative-link",
    surface: "Meeting workspace",
    component: "MeetingInitiativeLinkSelect",
    trigger: "inline picker",
    notes: "Link-only; no create overlay.",
  },
  {
    id: "strategy-document-link",
    surface: "Strategie authoring",
    component: "StrategyDocumentReferencesSection",
    trigger: "Dokument verknüpfen",
    notes: "Separate document link flow — review for modal usage.",
  },
] as const;

export type ContextualCreateGovernanceFinding = {
  file: string;
  reason: string;
};

export function collectContextualCreateEntryViolations(
  file: string,
  src: string,
): ContextualCreateGovernanceFinding[] {
  const normalized = file.replace(/\\/g, "/");
  if (
    !SCE_CONTEXTUAL_CREATE_INLINE_ENTRY_PATHS.includes(
      normalized as (typeof SCE_CONTEXTUAL_CREATE_INLINE_ENTRY_PATHS)[number],
    )
  ) {
    return [];
  }
  const findings: ContextualCreateGovernanceFinding[] = [];
  const usesComposerDialog =
    src.includes("CreateInitiativeComposerDialog") ||
    src.includes("CreateTargetComposerDialog") ||
    (src.includes("SceClubDevelopmentComposerShell") && src.includes("contextual"));
  if (usesComposerDialog) {
    findings.push({
      file: normalized,
      reason: "Contextual create/link entry still mounts modal ComposerDialog shell.",
    });
  }
  const hasFullPageCreate =
    src.includes('data-sce-contextual-create-flow="full-page"') ||
    src.includes("buildVereinsentwicklungZielNeuHref") ||
    src.includes("buildVereinsentwicklungStrategieNeuHref");
  if (
    !src.includes("ContextualCollapsibleCard") &&
    !src.includes("CreateInitiativeWorkspaceCollapsibleCard") &&
    !src.includes("CreateTargetWorkspaceCollapsibleCard") &&
    !src.includes('data-sce-contextual-create-flow="inline-collapsible"') &&
    !hasFullPageCreate
  ) {
    findings.push({
      file: normalized,
      reason: "Migrated contextual create entry missing inline collapsible or full-page create marker.",
    });
  }
  return findings;
}