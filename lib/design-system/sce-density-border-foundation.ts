/**
 * SCE-DESIGN-SYSTEM-09 PO addendum — product-wide density & border contracts (canonical for DS-10).
 *
 * Visual hierarchy: APP → CHROME → WORKSPACE → PAGE → SECTION → PANEL/CARD → CONTROL
 * Prefer spacing, typography, and surface tone before adding borders.
 */

export const SCE_DENSITY_BORDER_SYSTEM_LOCKS = {
  DENSITY_SYSTEM_CANONICAL: "YES",
  BORDER_SYSTEM_CANONICAL: "YES",
  PREMIUM_MEANS_OVERSIZED: "NO",
  BORDER_FOR_EVERY_HIERARCHY_LEVEL: "NO",
  NESTED_BORDER_SOUP_ALLOWED: "NO",
  CARD_SOUP_ALLOWED: "NO",
  FUNCTIONAL_SURFACE_HIERARCHY_REQUIRED: "YES",
  COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE: "YES",
} as const;

/** Spacing rhythm — comfortable-dense operational tier (Communication-aligned). */
export const SCE_DENSITY_BORDER_SPACING = {
  WORKSPACE_CONTENT_X: "px-0 md:px-0",
  WORKSPACE_CONTENT_PADDING: "p-4 md:p-5",
  WORKSPACE_SECTION_GAP: "space-y-4",
  PAGE_SECTION_GAP: "space-y-4",
  FORM_FIELD_GAP: "space-y-4",
  FORM_SECTION_GAP: "space-y-4",
  TOOLBAR_MIN_HEIGHT: "min-h-10",
  DENSE_ROW_Y: "py-3 md:py-3.5",
  HEADING_TO_CONTENT: "mt-1",
  ACTION_GAP: "gap-2",
} as const;

export const SCE_DENSITY_BORDER_RADIUS = {
  PANEL: "rounded-xl",
  NESTED_GROUP: "rounded-lg",
  CONTROL: "rounded-md",
} as const;

export const SCE_DENSITY_BORDER_STRENGTH = {
  PANEL: "border border-[var(--sce-surface-border)]",
  DIVIDER: "border-[var(--border)]",
  NESTED_PANEL_ALLOWED: "NO",
} as const;

export type SceDensityBorderAuditRow = {
  surface: string;
  routes: string;
  finding: string;
  ds09Action: "NORMALIZED" | "ALIGNED_CONTRACT" | "INVENTORY_DS10";
  notes: string;
};

/** Representative DS-09 surfaces — one density/border language, not identical layouts. */
export const SCE_DENSITY_BORDER_REPRESENTATIVE_AUDIT: SceDensityBorderAuditRow[] = [
  {
    surface: "Communication workspace",
    routes: "/dashboard/communication/*",
    finding: "Primary positive reference — panel padding p-4 md:p-5, restrained borders",
    ds09Action: "ALIGNED_CONTRACT",
    notes: "Do not regress Communication when normalizing elsewhere",
  },
  {
    surface: "Zielgruppen overview",
    routes: "/dashboard/communication/zielgruppen",
    finding: "Legacy table shell — align to dense surface containment in DS-10",
    ds09Action: "INVENTORY_DS10",
    notes: "DS-09: toolbar spacing normalized; table migration deferred",
  },
  {
    surface: "Zielgruppe creation",
    routes: "ZielgruppeDefinitionEditor, composer modal",
    finding: "Nested bordered whole-org control → canonical toggle row",
    ds09Action: "NORMALIZED",
    notes: "Modal-first create entry on list workspace",
  },
  {
    surface: "Email Sender",
    routes: "/dashboard/communication/email-sender",
    finding: "Form stacks; single panel — matches DS-09 form spacing",
    ds09Action: "ALIGNED_CONTRACT",
    notes: "Readiness surfaces use DS-07 feedback geometry",
  },
  {
    surface: "Roles overview",
    routes: "/dashboard/administration/roles",
    finding: "Dense table + page overflow containment",
    ds09Action: "NORMALIZED",
    notes: "min-w-0 chain + contained table scroll",
  },
  {
    surface: "Seasons",
    routes: "/dashboard/seasons",
    finding: "Inline create card → modal-first composer",
    ds09Action: "NORMALIZED",
    notes: "KPI cards retained; create moved to dialog",
  },
  {
    surface: "Facilities",
    routes: "FacilitiesAdminPanel",
    finding: "Inline expand create panel — border-heavy",
    ds09Action: "INVENTORY_DS10",
    notes: "Modal-first adoption in DS-10",
  },
  {
    surface: "People & Access",
    routes: "TenantUsersSearchableList",
    finding: "Canonical dense toolbar + empty state containment",
    ds09Action: "ALIGNED_CONTRACT",
    notes: "Person create already modal-first (PeopleAccessWizardDialog)",
  },
];

export const SCE_DENSITY_BORDER_DS10_DEBT = [
  "Product-wide workspace padding adoption",
  "Section spacing normalization on legacy admin pages",
  "Remove nested bordered sub-panels where spacing suffices",
  "Migrate legacy Communication/Zielgruppen table to SceDenseSurface",
  "Facilities inline create → canonical composer modal",
  "Unify empty-state containment classes",
] as const;
