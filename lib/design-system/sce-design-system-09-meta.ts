/**
 * SCE-DESIGN-SYSTEM-09 — responsive & accessibility metadata & product-wide audit.
 */
import {
  SCE_BINARY_CHECKBOX_COUNTS,
  SCE_BINARY_CONTROL_DS10_DEBT,
  SCE_DS09_BINARY_CONTROL_AUDIT,
} from "@/lib/design-system/sce-binary-checkbox-audit";
import {
  SCE_CREATE_FLOW_DS10_DEBT,
  SCE_CREATE_FLOW_LOCKS,
  SCE_CREATE_FLOW_REPRESENTATIVE_AUDIT,
} from "@/lib/design-system/sce-create-flow-foundation";
import {
  SCE_DENSITY_BORDER_DS10_DEBT,
  SCE_DENSITY_BORDER_REPRESENTATIVE_AUDIT,
  SCE_DENSITY_BORDER_SYSTEM_LOCKS,
} from "@/lib/design-system/sce-density-border-foundation";
import {
  SCE_DESIGN_SYSTEM_08_DS09_HANDOFF,
  SCE_DESIGN_SYSTEM_08_DS09_HANDOFF_DEBT,
} from "@/lib/design-system/sce-design-system-08-meta";
import {
  SCE_ACCESSIBILITY_CONTRACT,
  SCE_ACTIVITY_CARD_RESPONSIVE_CONTRACT,
  SCE_CONTENT_RESILIENCE_CONTRACT,
  SCE_DENSE_UI_RESPONSIVE_LOCKS,
  SCE_NAVIGATION_RESPONSIVE_LOCKS,
  SCE_RESPONSIVE_SYSTEM_LOCKS,
  SCE_TOUCH_TARGET_CONTRACT,
  SCE_WORKSPACE_RESPONSIVE_CONTRACT,
} from "@/lib/design-system/sce-responsive-accessibility-foundation";
import {
  SCE_RESPONSIVE_ACCESSIBILITY_MICRO_UX_DOC_MARKERS,
  SCE_RESPONSIVE_ACCESSIBILITY_MICRO_UX_GOVERNANCE,
} from "@/lib/design-system/sce-responsive-accessibility-micro-ux";
import { SCE_WORKSPACE_PRODUCT_WIDE_FLAGS } from "@/lib/design-system/sce-workspace-hierarchy";

export const SCE_DESIGN_SYSTEM_09_PACKAGE_KEY = "SCE-DESIGN-SYSTEM-09" as const;
export const SCE_DESIGN_SYSTEM_09_PREDECESSOR = "SCE-DESIGN-SYSTEM-08" as const;

export const SCE_DESIGN_SYSTEM_09_PO_FLAGS = {
  ...SCE_WORKSPACE_PRODUCT_WIDE_FLAGS,
  ...SCE_RESPONSIVE_SYSTEM_LOCKS,
  ...SCE_DENSE_UI_RESPONSIVE_LOCKS,
  ...SCE_NAVIGATION_RESPONSIVE_LOCKS,
  ...SCE_ACCESSIBILITY_CONTRACT,
  ...SCE_TOUCH_TARGET_CONTRACT,
  ...SCE_CONTENT_RESILIENCE_CONTRACT,
  FORM_CONTROL_SYSTEM_PRODUCT_WIDE: "YES",
  DENSE_UI_SYSTEM_PRODUCT_WIDE: "YES",
  STATUS_FEEDBACK_SYSTEM_PRODUCT_WIDE: "YES",
  ACTION_SYSTEM_PRODUCT_WIDE: "YES",
  COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE: "YES",
  VISIBLE_PRODUCT_ADOPTION_REQUIRED: "YES",
  VISIBLE_DESIGN_CONVERGENCE_REQUIRED: "YES",
  MANUAL_UAT_BY_CURSOR: "SKIPPED_PO_OWNED",
  SCREENSHOTS_BY_CURSOR: "SKIPPED_PO_OWNED",
} as const;

export const SCE_DESIGN_SYSTEM_09_PO_REVIEW = {
  DS09_STATUS: "CLOSED / ACCEPTED / MERGED",
  BASELINE_STAGE_HEAD: "758a52fd403406ad6cb2843cfdd0218e6b9974ad",
  BRANCH: "cursor/sce-design-system-09-responsive-accessibility",
  PREDECESSOR_DS08_PR: "886",
  PRIOR_DS09_PR: "887",
  PR: "889",
  PO_ADDENDUM: "DENSITY_BORDERS_MODAL_CREATE_TOGGLE_AUDIT",
  NEXT_PACKAGE: "SCE-DESIGN-SYSTEM-10 — Product-wide Adoption / Legacy Removal",
} as const;

export const SCE_DESIGN_SYSTEM_09_PO_CLOSURE = {
  PO_DS09_VISUAL_UAT: "PASS",
  PO_DS09_RESPONSIVE_REVIEW: "PASS",
  PO_DS09_ACCESSIBILITY_REVIEW: "PASS",
  PO_DS09_DENSITY_BORDER_REVIEW: "PASS",
  PO_DS09_MODAL_FIRST_CREATE_REVIEW: "PASS",
  PO_DS09_TOGGLE_FIRST_REVIEW: "PASS",
  PO_DS09_ROLES_OVERFLOW_REVIEW: "PASS",
  PO_RESPONSIVE_REVIEW: "PASS",
  PO_ACCESSIBILITY_REVIEW: "PASS",
  PO_DESKTOP_REVIEW: "PASS",
  PO_MOBILE_REVIEW: "PASS",
  PO_TABLET_REVIEW: "PASS",
  PO_HORIZONTAL_OVERFLOW_REVIEW: "PASS",
  PO_LONG_CONTENT_REFLOW_REVIEW: "PASS",
  PO_KEYBOARD_FOCUS_REVIEW: "PASS",
  DS09_STATUS: "CLOSED / ACCEPTED / MERGED",
  PR: "889",
  PRIOR_DS09_PR: "887",
  ACCEPTED_DS09_HEAD: "2a71b2779f56d307419714b1c4e7ecebe06c6d10",
  FEATURE_HEAD_BEFORE_CLOSURE: "2a71b2779f56d307419714b1c4e7ecebe06c6d10",
  /** Prior DS-09 closure on STAGE (PR #887 responsive/a11y baseline). */
  PRIOR_CLOSURE_COMMIT: "ae705a70f0fa3876cea6c66f94e22ab82249d504",
  /** Merge SHA on STAGE after PR #887. */
  PRIOR_STAGE_MERGE_COMMIT: "0dbfb886714ff7bf2164a6f41611b7657e17b590",
  /** Set on final PO addendum closure commit — merge SHA recorded on STAGE after PR #889 merge. */
  CLOSURE_COMMIT: "0000000000000000000000000000000000000000",
  STAGE_MERGE_COMMIT: "0000000000000000000000000000000000000000",
  NEXT_PACKAGE: "SCE-DESIGN-SYSTEM-10 — Product-wide Adoption / Legacy Removal",
} as const;

export type SceResponsiveA11yAuditClassification =
  | "CANONICAL"
  | "MIGRATE_DS09"
  | "MIGRATE_LATER_DS10"
  | "DOMAIN_SPECIFIC_CANONICAL"
  | "DUPLICATE"
  | "LEGACY_REPLACE";

export type SceResponsiveA11yAuditEntry = {
  area: string;
  routes: string;
  classification: SceResponsiveA11yAuditClassification;
  responsiveFinding: string;
  a11yFinding: string;
  canonicalTarget: string;
  notes: string;
};

/** Product-wide responsive + accessibility audit (representative routes). */
export const SCE_DESIGN_SYSTEM_09_RESPONSIVE_A11Y_AUDIT: SceResponsiveA11yAuditEntry[] = [
  {
    area: "Global navbar / identity rail",
    routes: "AppShellNavigation, global-app-navigation.css",
    classification: "MIGRATE_DS09",
    responsiveFinding: "Desktop module nav + tenant identity — narrow desktop reflow",
    a11yFinding: "Focus-visible on primary nav; mobile bottom nav focus gap",
    canonicalTarget: "AppShellNavigation + SCE page overflow guard",
    notes: "DS-09 hardens mobile bottom nav focus + touch targets",
  },
  {
    area: "Mobile bottom navigation",
    routes: "layout sce-app-main-with-mobile-nav",
    classification: "MIGRATE_DS09",
    responsiveFinding: "Fixed bottom chrome — content clearance required",
    a11yFinding: "Icon+label targets; focus ring on items",
    canonicalTarget: "sce-mobile-bottom-nav + padding-bottom on main",
    notes: "BOTTOM_NAV_CONTENT_OBSCURED = NO",
  },
  {
    area: "Dashboard",
    routes: "/dashboard",
    classification: "CANONICAL",
    responsiveFinding: "Programme cards + KPI grid reflow",
    a11yFinding: "Heading hierarchy on workspace sections",
    canonicalTarget: "SceWorkspaceHeader + activity card family",
    notes: "Communication remains visual reference — do not regress",
  },
  {
    area: "Mein Programm",
    routes: "dashboard programme",
    classification: "CANONICAL",
    responsiveFinding: "Activity card densities COMPACT/STANDARD",
    a11yFinding: "Card links focus-visible; schedule text readable",
    canonicalTarget: "SceProgrammeActivityCardShell + Sce*Card",
    notes: SCE_ACTIVITY_CARD_RESPONSIVE_CONTRACT.MATCH_IDENTITY_GRAMMAR,
  },
  {
    area: "Communication",
    routes: "/dashboard/communication",
    classification: "CANONICAL",
    responsiveFinding: "Primary positive reference — layered surfaces preserved on mobile",
    a11yFinding: "Inbox landmarks + list semantics",
    canonicalTarget: "CommunicationHub — no layout copy elsewhere",
    notes: "COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE = YES",
  },
  {
    area: "Email Sender",
    routes: "/dashboard/communication/email-sender",
    classification: "CANONICAL",
    responsiveFinding: "Form stacks on narrow widths",
    a11yFinding: "SceFormField labels + errors",
    canonicalTarget: "DS-05 controls",
    notes: "Do not make Communication worse",
  },
  {
    area: "Tournament Center / workspace / Planung",
    routes: "tournament modules",
    classification: "DOMAIN_SPECIFIC_CANONICAL",
    responsiveFinding: "Fixture matrices — contained horizontal scroll",
    a11yFinding: "Table/grid semantics where tabular",
    canonicalTarget: "SceTournamentFixturePresentation + domain grids",
    notes: "Preserve operational tournament patterns (DS-01-R1)",
  },
  {
    area: "Activity cards",
    routes: "SceMatchCard, SceTrainingCard, SceTournamentCard, SceClubEventCard",
    classification: "MIGRATE_DS09",
    responsiveFinding: "Long club/team names, location hierarchy wrap",
    a11yFinding: "Full-card link focus; VS decorative",
    canonicalTarget: "MatchClubPair + density scale tokens",
    notes: "HERO/STANDARD/COMPACT/MICRO — one family",
  },
  {
    area: "Activity Composer",
    routes: "SceActivityComposer",
    classification: "MIGRATE_DS09",
    responsiveFinding: "Full-screen mobile shell (DS-06 preserved)",
    a11yFinding: "Focus trap + dirty guard + step semantics",
    canonicalTarget: "SceActivityComposer + SCE_RESPONSIVE_DIALOG_CONTRACT",
    notes: "No Modal→Modal default",
  },
  {
    area: "Dialogs / confirm",
    routes: "Dialog, SceConfirmDialog, SceModalOverlay",
    classification: "MIGRATE_DS09",
    responsiveFinding: "Mobile full-viewport shell for standard Dialog",
    a11yFinding: "aria-modal, focus restore, Escape",
    canonicalTarget: "Dialog + useSceModalDialog",
    notes: "DS-09 completes deferred mobile Dialog hardening",
  },
  {
    area: "Forms & controls",
    routes: "components/sce/forms/*",
    classification: "MIGRATE_DS09",
    responsiveFinding: "Toolbar + field groups stack — not tiny side-by-side",
    a11yFinding: "aria-describedby, invalid states, Toggle First",
    canonicalTarget: "SceFormField + DS-05 primitives",
    notes: "Legacy admin forms → DS-10",
  },
  {
    area: "Feedback / readiness / empty / error",
    routes: "SceEmptyState, SceSemanticFeedback, SceSkeleton",
    classification: "MIGRATE_DS09",
    responsiveFinding: "Empty states not oversized on mobile; text reflow",
    a11yFinding: "role=status/alert; reduced motion on skeletons",
    canonicalTarget: "DS-07 feedback family",
    notes: "Same geometry as owning surface",
  },
  {
    area: "People & Access",
    routes: "/dashboard/admin/people-access",
    classification: "MIGRATE_DS09",
    responsiveFinding: "Dense grid + toolbar reflow (PO accepted direction)",
    a11yFinding: "Row keyboard activation; search labels",
    canonicalTarget: "TenantUsersSearchableList + SceDenseGridRow",
    notes: "Do not redesign — harden canonical strategy",
  },
  {
    area: "Roles & Permissions",
    routes: "/dashboard/administration/roles",
    classification: "MIGRATE_DS09",
    responsiveFinding: "Table + contained scroll desktop; dense list mobile",
    a11yFinding: "Table headers scope=col; sort aria-sort",
    canonicalTarget: "TenantRolesOverviewDenseTable",
    notes: "PO accepted desktop table direction",
  },
  {
    area: "Wochenplaner / planning",
    routes: "WeekPlanner, Planning Hub",
    classification: "DOMAIN_SPECIFIC_CANONICAL",
    responsiveFinding: "Calendar horizontal scroll in semantic region",
    a11yFinding: "Keyboard on tabs/toolbars",
    canonicalTarget: "Planner responsive data views",
    notes: "From DS-08 inventory futurePackage DS-09",
  },
  {
    area: "Publishing / admin lists",
    routes: "publishing, admin tables",
    classification: "MIGRATE_LATER_DS10",
    responsiveFinding: "Local overflow-x-auto wrappers",
    a11yFinding: "Legacy table headers",
    canonicalTarget: "SceDenseSurface migration DS-10",
    notes: "Audit only — not full migration in DS-09",
  },
  {
    area: "Legacy admin forms",
    routes: "wide legacy pages",
    classification: "LEGACY_REPLACE",
    responsiveFinding: "Desktop-only wide layouts",
    a11yFinding: "Missing focus on some legacy controls",
    canonicalTarget: "PageShell + DS-05 adoption",
    notes: "DS-01 matrix P2 → DS-10 with DS-09 primitive readiness",
  },
];

export type SceResponsiveA11yInventoryRow = {
  id: string;
  surface: string;
  domainRoutes: string;
  classification: SceResponsiveA11yAuditClassification;
  ds09Action: "HARDENED" | "CONTRACT" | "INVENTORY" | "DEFER";
  futurePackage: "DS-09" | "DS-10" | "NONE";
  status: "HARDENED" | "CONTRACT" | "REMAINING";
};

export const SCE_DESIGN_SYSTEM_09_RESPONSIVE_A11Y_INVENTORY: SceResponsiveA11yInventoryRow[] =
  SCE_DESIGN_SYSTEM_09_RESPONSIVE_A11Y_AUDIT.map((row, index) => {
    const hardened =
      row.area === "Global navbar / identity rail" ||
      row.area === "Mobile bottom navigation" ||
      row.area === "Dialogs / confirm" ||
      row.area === "People & Access" ||
      row.area === "Roles & Permissions" ||
      row.area === "Activity cards" ||
      row.area === "Feedback / readiness / empty / error";
    const contract =
      row.area === "Communication" ||
      row.area === "Mein Programm" ||
      row.area === "Activity Composer";
    const action: SceResponsiveA11yInventoryRow["ds09Action"] = hardened
      ? "HARDENED"
      : contract
        ? "CONTRACT"
        : row.classification === "MIGRATE_LATER_DS10" ||
            row.classification === "LEGACY_REPLACE"
          ? "DEFER"
          : "INVENTORY";
    return {
      id: `DS09-RA-${String(index + 1).padStart(3, "0")}`,
      surface: row.area,
      domainRoutes: row.routes,
      classification: row.classification,
      ds09Action: action,
      futurePackage:
        action === "HARDENED" || action === "CONTRACT" ? "NONE" : "DS-10",
      status:
        action === "HARDENED"
          ? "HARDENED"
          : action === "CONTRACT"
            ? "CONTRACT"
            : "REMAINING",
    };
  });

/** Explicit DS-10 handoff — DS-09 does not claim product-wide migration complete. */
export const SCE_DESIGN_SYSTEM_09_DS10_HANDOFF_DEBT = [
  "DS-01 primitive registry legacy rows",
  "DS-05 binary-control deferred inventory",
  "DS-07 feedback inventory remaining surfaces",
  "DS-08 dense UI inventory REMAINING surfaces",
  "DS-09 responsive/a11y inventory REMAINING surfaces",
  "DENSITY_BORDER_DEBT",
  "CREATE_FLOW_MODAL_MIGRATION_DEBT",
  "BINARY_CONTROL_MIGRATION_DEBT",
  "legacy workspace shells",
  "legacy navigation duplicates",
  "local empty states",
  "local row action menus",
  "desktop-only admin forms",
  "unexplained micro pattern drift",
] as const;

export const SCE_DESIGN_SYSTEM_09_DS10_HANDOFF = {
  DS10_FINAL_ADOPTION_REQUIRED: "YES",
  DS10_PRODUCT_WIDE_DENSITY_ADOPTION_REQUIRED: "YES",
  DS10_PRODUCT_WIDE_BORDER_ADOPTION_REQUIRED: "YES",
  DS10_MODAL_FIRST_CREATE_ADOPTION_REQUIRED: "YES",
  DS10_BINARY_CONTROL_FINAL_MIGRATION_REQUIRED: "YES",
  PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE: "NO",
  PRODUCT_WIDE_RESPONSIVE_MIGRATION_COMPLETE: "NO",
  PRODUCT_WIDE_ACCESSIBILITY_MIGRATION_COMPLETE: "NO",
  PRODUCT_WIDE_DENSITY_MIGRATION_COMPLETE: "NO",
  PRODUCT_WIDE_CREATE_FLOW_MIGRATION_COMPLETE: "NO",
  PRODUCT_WIDE_BINARY_CONTROL_MIGRATION_COMPLETE: "NO",
  DEBT: SCE_DESIGN_SYSTEM_09_DS10_HANDOFF_DEBT,
  DENSITY_BORDER_DEBT: SCE_DENSITY_BORDER_DS10_DEBT,
  CREATE_FLOW_MODAL_MIGRATION_DEBT: SCE_CREATE_FLOW_DS10_DEBT,
  BINARY_CONTROL_MIGRATION_DEBT: SCE_BINARY_CONTROL_DS10_DEBT,
  NEXT_PACKAGE: "SCE-DESIGN-SYSTEM-10 — Product-wide Adoption / Legacy Removal",
} as const;

export const SCE_DESIGN_SYSTEM_09_DOC_MARKERS = [
  "SCE-DESIGN-SYSTEM-09",
  "RESPONSIVE_SYSTEM_PRODUCT_WIDE",
  "ACCESSIBILITY_SYSTEM_PRODUCT_WIDE",
  "SCE_RESPONSIVE_VIEWPORT_TIERS",
  "SCE_ACCESSIBILITY_CONTRACT",
  "SCE_TOUCH_TARGET_CONTRACT",
  "SCE-DESIGN-SYSTEM-09-RESPONSIVE-A11Y-INVENTORY",
  "SCE-DESIGN-SYSTEM-09-DS10-HANDOFF",
  "SCE_DESIGN_SYSTEM_09_CLOSED_ACCEPTED_MERGED",
  ...SCE_RESPONSIVE_ACCESSIBILITY_MICRO_UX_DOC_MARKERS,
] as const;

export const SCE_DESIGN_SYSTEM_09_GOVERNANCE = {
  SCE_DESIGN_SYSTEM_COMPLIANCE: "PASS",
  ...SCE_RESPONSIVE_SYSTEM_LOCKS,
  ...SCE_DENSE_UI_RESPONSIVE_LOCKS,
  ...SCE_NAVIGATION_RESPONSIVE_LOCKS,
  ...SCE_ACCESSIBILITY_CONTRACT,
  ...SCE_TOUCH_TARGET_CONTRACT,
  ...SCE_CONTENT_RESILIENCE_CONTRACT,
  ...SCE_WORKSPACE_RESPONSIVE_CONTRACT,
  ...SCE_ACTIVITY_CARD_RESPONSIVE_CONTRACT,
  ...SCE_DENSITY_BORDER_SYSTEM_LOCKS,
  ...SCE_CREATE_FLOW_LOCKS,
  VISIBLE_PRODUCT_ADOPTION_REQUIRED: "YES",
  VISIBLE_DESIGN_CONVERGENCE_REQUIRED: "YES",
  DENSE_UI_PAGE_HORIZONTAL_OVERFLOW: "NO",
  LOCAL_SWITCH_IMPLEMENTATIONS_ALLOWED: "NO",
  BINARY_SETTING_CHECKBOX_ALLOWED: "NO",
  MULTI_SELECTION_CHECKBOX_ALLOWED: "YES",
  ROW_SELECTION_CHECKBOX_ALLOWED_WHEN_MULTI_SELECTION: "YES",
  CONTAINED_TABLE_SCROLL_ALLOWED_WHEN_SEMANTIC: "YES",
  ...SCE_RESPONSIVE_ACCESSIBILITY_MICRO_UX_GOVERNANCE,
  DS08_HANDOFF_DEBT_ADDRESSED: "REPRESENTATIVE — canonical primitives + adoption sites",
  DS08_HANDOFF_DEBT: SCE_DESIGN_SYSTEM_08_DS09_HANDOFF_DEBT,
  DS08_HANDOFF_LOCKS: SCE_DESIGN_SYSTEM_08_DS09_HANDOFF,
  ...SCE_DESIGN_SYSTEM_09_DS10_HANDOFF,
  RESPONSIVE_COMPLIANCE: "CANONICAL_PASS_DS09",
  ACCESSIBILITY_COMPLIANCE: "CANONICAL_PASS_DS09",
  NEW_BINARY_CHECKBOXES: 0,
  BINARY_CONTROL_COMPLIANCE: "PASS",
  CANONICAL_TOGGLES_USED: "YES",
  MULTI_SELECTION_PATTERN: "ROW_SELECTION_CHECKBOX_ALLOWED = YES_WHEN_MULTI_SELECTION",
  BINARY_CHECKBOX_DEFERRED: SCE_BINARY_CHECKBOX_COUNTS.BINARY_SETTING_CHECKBOXES_DEFERRED,
} as const;

export const SCE_DESIGN_SYSTEM_09_REPRESENTATIVE_ADOPTION = {
  GLOBAL_NAV_AND_MOBILE_BOTTOM_NAV: "HARDENED",
  WORKSPACE_HEADER_RESPONSIVE: "HARDENED",
  PEOPLE_ACCESS_DENSE_RESPONSIVE: "HARDENED",
  ROLES_DENSE_RESPONSIVE: "HARDENED",
  ROLES_PAGE_OVERFLOW_CONTAINMENT: "HARDENED",
  ACTIVITY_CARD_TEXT_RESILIENCE: "HARDENED",
  DIALOG_MOBILE_SHELL: "HARDENED",
  FEEDBACK_EMPTY_STATE_REFLOW: "HARDENED",
  DENSITY_BORDER_REPRESENTATIVE: "NORMALIZED",
  CREATE_FLOW_MODAL_ZIELGRUPPE: "ADOPTED",
  CREATE_FLOW_MODAL_SEASON: "ADOPTED",
  BINARY_CONTROL_ZIELGRUPPE_WHOLE_ORG: "MIGRATED_TOGGLE",
  DETAIL:
    "PO addendum — density/border contract, roles overflow containment, modal-first create on representative flows, toggle-first binary audit",
} as const;

export const SCE_DESIGN_SYSTEM_09_DENSITY_BORDER_AUDIT =
  SCE_DENSITY_BORDER_REPRESENTATIVE_AUDIT;

export const SCE_DESIGN_SYSTEM_09_CREATE_FLOW_AUDIT = SCE_CREATE_FLOW_REPRESENTATIVE_AUDIT;

export const SCE_DESIGN_SYSTEM_09_BINARY_CONTROL_AUDIT = SCE_DS09_BINARY_CONTROL_AUDIT;
