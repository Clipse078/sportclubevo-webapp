/**
 * SCE-DS2-07G — verification matrix (generated; do not hand-edit).
 * Regenerate: node scripts/sce-ds2-07g-build-verification-matrix.mjs
 */
import type {
  SceDs207gVerificationMatrixEntry,
  SceDs207gVerificationSummary,
} from "./sce-ds2-07g-meta";

export const SCE_DS2_07G_VERIFICATION_MATRIX: SceDs207gVerificationMatrixEntry[] = [
  {
    "urlPattern": "/admin",
    "sourceFile": "app/(admin)/admin/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_admin-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_admin-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_admin-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_admin-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard",
    "sourceFile": "app/(admin)/dashboard/(personal-dashboard)/page.tsx",
    "module": "dashboard",
    "requiredPermissions": [
      "dashboard.view"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/account",
    "sourceFile": "app/(admin)/dashboard/account/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_account-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_account-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_account-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_account-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/activity/event/[eventId]",
    "sourceFile": "app/(admin)/dashboard/activity/event/[eventId]/page.tsx",
    "module": "events",
    "requiredPermissions": [
      "events.view"
    ],
    "testPersona": "Events workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_activity_event_cmw72jaan009u08l83zagrrhc-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_activity_event_cmw72jaan009u08l83zagrrhc-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_activity_event_cmw72jaan009u08l83zagrrhc-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_activity_event_cmw72jaan009u08l83zagrrhc-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/activity/training-session/[sessionId]",
    "sourceFile": "app/(admin)/dashboard/activity/training-session/[sessionId]/page.tsx",
    "module": "training",
    "requiredPermissions": [
      "training.view"
    ],
    "testPersona": "Training workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "PENDING",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_activity_training-session_cmsp357it006i04jo8qlslonz-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_activity_training-session_cmsp357it006i04jo8qlslonz-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_activity_training-session_cmsp357it006i04jo8qlslonz-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin",
    "sourceFile": "app/(admin)/dashboard/admin/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/branding",
    "sourceFile": "app/(admin)/dashboard/admin/branding/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_branding-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_branding-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_branding-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_branding-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/commercial/billing",
    "sourceFile": "app/(admin)/dashboard/admin/commercial/billing/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/commercial/billing/contracts",
    "sourceFile": "app/(admin)/dashboard/admin/commercial/billing/contracts/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_contracts-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_contracts-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_contracts-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_contracts-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/commercial/billing/contracts/[contractKey]",
    "sourceFile": "app/(admin)/dashboard/admin/commercial/billing/contracts/[contractKey]/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_contracts_fca-2026-001-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_contracts_fca-2026-001-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_contracts_fca-2026-001-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_contracts_fca-2026-001-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/commercial/billing/contracts/new",
    "sourceFile": "app/(admin)/dashboard/admin/commercial/billing/contracts/new/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_contracts_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_contracts_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_contracts_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_contracts_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/commercial/billing/customers",
    "sourceFile": "app/(admin)/dashboard/admin/commercial/billing/customers/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_customers-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_customers-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_customers-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_customers-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/commercial/billing/customers/[customerKey]",
    "sourceFile": "app/(admin)/dashboard/admin/commercial/billing/customers/[customerKey]/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_customers_fca-0001-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_customers_fca-0001-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_customers_fca-0001-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_customers_fca-0001-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/commercial/billing/customers/new",
    "sourceFile": "app/(admin)/dashboard/admin/commercial/billing/customers/new/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_customers_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_customers_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_customers_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_customers_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/commercial/billing/invoices",
    "sourceFile": "app/(admin)/dashboard/admin/commercial/billing/invoices/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_invoices-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_invoices-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_invoices-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_invoices-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/commercial/billing/invoices/[invoiceKey]",
    "sourceFile": "app/(admin)/dashboard/admin/commercial/billing/invoices/[invoiceKey]/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_invoices_inv-fca-2026-001-4-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_invoices_inv-fca-2026-001-4-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_invoices_inv-fca-2026-001-4-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_invoices_inv-fca-2026-001-4-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/commercial/billing/invoices/new",
    "sourceFile": "app/(admin)/dashboard/admin/commercial/billing/invoices/new/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_invoices_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_invoices_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_invoices_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_invoices_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/commercial/billing/operations",
    "sourceFile": "app/(admin)/dashboard/admin/commercial/billing/operations/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_operations-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_operations-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_operations-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_operations-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/commercial/billing/reconciliation",
    "sourceFile": "app/(admin)/dashboard/admin/commercial/billing/reconciliation/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_reconciliation-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_reconciliation-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_reconciliation-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_reconciliation-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/commercial/billing/reconciliation/imports/[importKey]",
    "sourceFile": "app/(admin)/dashboard/admin/commercial/billing/reconciliation/imports/[importKey]/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_reconciliation_imports_ds2-07g-verification-import-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_reconciliation_imports_ds2-07g-verification-import-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_reconciliation_imports_ds2-07g-verification-import-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_reconciliation_imports_ds2-07g-verification-import-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/commercial/billing/settings",
    "sourceFile": "app/(admin)/dashboard/admin/commercial/billing/settings/page.tsx",
    "module": "settings",
    "requiredPermissions": [
      "settings.view"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_settings-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_settings-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_settings-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_settings-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/commercial/billing/settings/legal-entities/[entityKey]",
    "sourceFile": "app/(admin)/dashboard/admin/commercial/billing/settings/legal-entities/[entityKey]/page.tsx",
    "module": "settings",
    "requiredPermissions": [
      "settings.view"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_settings_legal-entities_sportclubevo-by-tulip-digital-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_settings_legal-entities_sportclubevo-by-tulip-digital-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_settings_legal-entities_sportclubevo-by-tulip-digital-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_settings_legal-entities_sportclubevo-by-tulip-digital-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/commercial/billing/settings/legal-entities/new",
    "sourceFile": "app/(admin)/dashboard/admin/commercial/billing/settings/legal-entities/new/page.tsx",
    "module": "settings",
    "requiredPermissions": [
      "settings.view"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_settings_legal-entities_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_settings_legal-entities_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_settings_legal-entities_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_commercial_billing_settings_legal-entities_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/facilities",
    "sourceFile": "app/(admin)/dashboard/admin/facilities/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_facilities-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_facilities-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_facilities-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_facilities-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/integrations",
    "sourceFile": "app/(admin)/dashboard/admin/integrations/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_integrations-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_integrations-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_integrations-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_integrations-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/integrations/sfv",
    "sourceFile": "app/(admin)/dashboard/admin/integrations/sfv/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_integrations_sfv-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_integrations_sfv-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_integrations_sfv-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_integrations_sfv-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/people-access",
    "sourceFile": "app/(admin)/dashboard/admin/people-access/page.tsx",
    "module": "persons",
    "requiredPermissions": [
      "people.view"
    ],
    "testPersona": "People & access administrator",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_people-access-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_people-access-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_people-access-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_people-access-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/people-access/new",
    "sourceFile": "app/(admin)/dashboard/admin/people-access/new/page.tsx",
    "module": "persons",
    "requiredPermissions": [
      "people.view"
    ],
    "testPersona": "People & access administrator",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_people-access_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_people-access_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_people-access_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_people-access_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/tenants",
    "sourceFile": "app/(admin)/dashboard/admin/tenants/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_tenants-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_tenants-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_tenants-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_tenants-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/tenants/[tenantSlug]",
    "sourceFile": "app/(admin)/dashboard/admin/tenants/[tenantSlug]/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_tenants_fc-allschwil-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_tenants_fc-allschwil-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_tenants_fc-allschwil-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_tenants_fc-allschwil-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/tenants/new",
    "sourceFile": "app/(admin)/dashboard/admin/tenants/new/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_tenants_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_tenants_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_tenants_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_tenants_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/admin/users/[userId]",
    "sourceFile": "app/(admin)/dashboard/admin/users/[userId]/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_users_cmuo3i7kj000h04ibbahuwqyu-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_users_cmuo3i7kj000h04ibbahuwqyu-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_users_cmuo3i7kj000h04ibbahuwqyu-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_admin_users_cmuo3i7kj000h04ibbahuwqyu-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/administration/roles",
    "sourceFile": "app/(admin)/dashboard/administration/roles/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/administration/roles/[id]",
    "sourceFile": "app/(admin)/dashboard/administration/roles/[id]/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles_cmuo3h0bt000104ib3v2p4fj3-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles_cmuo3h0bt000104ib3v2p4fj3-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles_cmuo3h0bt000104ib3v2p4fj3-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles_cmuo3h0bt000104ib3v2p4fj3-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/administration/roles/assignments",
    "sourceFile": "app/(admin)/dashboard/administration/roles/assignments/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles_assignments-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles_assignments-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles_assignments-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles_assignments-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/administration/roles/effective-access",
    "sourceFile": "app/(admin)/dashboard/administration/roles/effective-access/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles_effective-access-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles_effective-access-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles_effective-access-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles_effective-access-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/administration/roles/new",
    "sourceFile": "app/(admin)/dashboard/administration/roles/new/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_administration_roles_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/aufgaben",
    "sourceFile": "app/(admin)/dashboard/aufgaben/page.tsx",
    "module": "aufgaben",
    "requiredPermissions": [
      "tasks.view"
    ],
    "testPersona": "Tasks workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/aufgaben/[taskId]",
    "sourceFile": "app/(admin)/dashboard/aufgaben/[taskId]/page.tsx",
    "module": "aufgaben",
    "requiredPermissions": [
      "tasks.view"
    ],
    "testPersona": "Tasks workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_cmuhb94k1000004l8brm0ud12-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_cmuhb94k1000004l8brm0ud12-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_cmuhb94k1000004l8brm0ud12-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_cmuhb94k1000004l8brm0ud12-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/aufgaben/[taskId]",
    "sourceFile": "app/(admin)/dashboard/aufgaben/@task/(.)[taskId]/page.tsx",
    "module": "aufgaben",
    "requiredPermissions": [
      "tasks.view"
    ],
    "testPersona": "Tasks workspace editor",
    "pageArchetype": "intercept",
    "intercept": true,
    "parallelSlot": "@task",
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "NOT_APPLICABLE",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_cmuhb94k1000004l8brm0ud12-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_cmuhb94k1000004l8brm0ud12-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_cmuhb94k1000004l8brm0ud12-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_cmuhb94k1000004l8brm0ud12-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/aufgaben/anforderung/[recipientId]",
    "sourceFile": "app/(admin)/dashboard/aufgaben/anforderung/[recipientId]/page.tsx",
    "module": "aufgaben",
    "requiredPermissions": [
      "tasks.view"
    ],
    "testPersona": "Tasks workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_anforderung_sce-ds2-07g-vfy-recipient-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_anforderung_sce-ds2-07g-vfy-recipient-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_anforderung_sce-ds2-07g-vfy-recipient-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_anforderung_sce-ds2-07g-vfy-recipient-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/aufgaben/anforderungen/[requirementId]",
    "sourceFile": "app/(admin)/dashboard/aufgaben/anforderungen/[requirementId]/page.tsx",
    "module": "aufgaben",
    "requiredPermissions": [
      "tasks.view"
    ],
    "testPersona": "Tasks workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_anforderungen_sce-ds2-07g-vfy-requirement-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_anforderungen_sce-ds2-07g-vfy-requirement-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_anforderungen_sce-ds2-07g-vfy-requirement-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_anforderungen_sce-ds2-07g-vfy-requirement-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/aufgaben/anforderungen/neu",
    "sourceFile": "app/(admin)/dashboard/aufgaben/anforderungen/neu/page.tsx",
    "module": "aufgaben",
    "requiredPermissions": [
      "tasks.view"
    ],
    "testPersona": "Tasks workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_anforderungen_neu-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_anforderungen_neu-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_anforderungen_neu-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_anforderungen_neu-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/aufgaben/neu",
    "sourceFile": "app/(admin)/dashboard/aufgaben/neu/page.tsx",
    "module": "aufgaben",
    "requiredPermissions": [
      "tasks.view"
    ],
    "testPersona": "Tasks workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_neu-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_neu-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_neu-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_neu-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/aufgaben/serien/[seriesId]",
    "sourceFile": "app/(admin)/dashboard/aufgaben/serien/[seriesId]/page.tsx",
    "module": "aufgaben",
    "requiredPermissions": [
      "tasks.view"
    ],
    "testPersona": "Tasks workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_serien_cmsp4t1oa000004jvytoux8ju-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_serien_cmsp4t1oa000004jvytoux8ju-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_serien_cmsp4t1oa000004jvytoux8ju-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_serien_cmsp4t1oa000004jvytoux8ju-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/aufgaben/serien/neu",
    "sourceFile": "app/(admin)/dashboard/aufgaben/serien/neu/page.tsx",
    "module": "aufgaben",
    "requiredPermissions": [
      "tasks.view"
    ],
    "testPersona": "Tasks workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_serien_neu-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_serien_neu-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_serien_neu-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_aufgaben_serien_neu-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication",
    "sourceFile": "app/(admin)/dashboard/communication/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication/email-sender",
    "sourceFile": "app/(admin)/dashboard/communication/email-sender/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_email-sender-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_email-sender-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_email-sender-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_email-sender-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication/inbox",
    "sourceFile": "app/(admin)/dashboard/communication/inbox/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_inbox-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_inbox-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_inbox-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_inbox-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication/inbox/new",
    "sourceFile": "app/(admin)/dashboard/communication/inbox/new/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_inbox_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_inbox_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_inbox_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_inbox_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication/inbox/settings",
    "sourceFile": "app/(admin)/dashboard/communication/inbox/settings/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_inbox_settings-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_inbox_settings-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_inbox_settings-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_inbox_settings-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication/kampagnen",
    "sourceFile": "app/(admin)/dashboard/communication/kampagnen/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_kampagnen-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_kampagnen-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_kampagnen-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_kampagnen-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication/kampagnen/[id]",
    "sourceFile": "app/(admin)/dashboard/communication/kampagnen/[id]/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_kampagnen_sce-ds2-07g-vfy-campaign-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_kampagnen_sce-ds2-07g-vfy-campaign-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_kampagnen_sce-ds2-07g-vfy-campaign-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_kampagnen_sce-ds2-07g-vfy-campaign-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication/kampagnen/new",
    "sourceFile": "app/(admin)/dashboard/communication/kampagnen/new/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_kampagnen_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_kampagnen_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_kampagnen_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_kampagnen_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication/mitteilungen",
    "sourceFile": "app/(admin)/dashboard/communication/mitteilungen/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_mitteilungen-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_mitteilungen-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_mitteilungen-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_mitteilungen-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication/mitteilungen/[id]",
    "sourceFile": "app/(admin)/dashboard/communication/mitteilungen/[id]/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_mitteilungen_cmv2a96wl000306l0qjopeimu-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_mitteilungen_cmv2a96wl000306l0qjopeimu-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_mitteilungen_cmv2a96wl000306l0qjopeimu-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_mitteilungen_cmv2a96wl000306l0qjopeimu-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication/mitteilungen/new",
    "sourceFile": "app/(admin)/dashboard/communication/mitteilungen/new/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_mitteilungen_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_mitteilungen_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_mitteilungen_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_mitteilungen_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication/personal-signature",
    "sourceFile": "app/(admin)/dashboard/communication/personal-signature/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_personal-signature-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_personal-signature-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_personal-signature-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_personal-signature-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication/vorlagen",
    "sourceFile": "app/(admin)/dashboard/communication/vorlagen/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_vorlagen-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_vorlagen-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_vorlagen-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_vorlagen-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication/vorlagen/[id]",
    "sourceFile": "app/(admin)/dashboard/communication/vorlagen/[id]/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_vorlagen_sce-ds2-07g-vfy-template-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_vorlagen_sce-ds2-07g-vfy-template-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_vorlagen_sce-ds2-07g-vfy-template-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_vorlagen_sce-ds2-07g-vfy-template-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication/vorlagen/new",
    "sourceFile": "app/(admin)/dashboard/communication/vorlagen/new/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_vorlagen_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_vorlagen_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_vorlagen_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_vorlagen_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication/zielgruppen",
    "sourceFile": "app/(admin)/dashboard/communication/zielgruppen/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_zielgruppen-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_zielgruppen-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_zielgruppen-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_zielgruppen-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication/zielgruppen/[id]",
    "sourceFile": "app/(admin)/dashboard/communication/zielgruppen/[id]/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_zielgruppen_cmq5idbdo000004js98c7l1wx-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_zielgruppen_cmq5idbdo000004js98c7l1wx-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_zielgruppen_cmq5idbdo000004js98c7l1wx-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_zielgruppen_cmq5idbdo000004js98c7l1wx-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/communication/zielgruppen/new",
    "sourceFile": "app/(admin)/dashboard/communication/zielgruppen/new/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_zielgruppen_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_zielgruppen_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_zielgruppen_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_communication_zielgruppen_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/competitions",
    "sourceFile": "app/(admin)/dashboard/competitions/page.tsx",
    "module": "tournaments",
    "requiredPermissions": [
      "tournaments.view"
    ],
    "testPersona": "Tournaments workspace editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_competitions-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_competitions-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_competitions-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_competitions-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/dev/sce-icons",
    "sourceFile": "app/(admin)/dashboard/dev/sce-icons/page.tsx",
    "module": "dashboard",
    "requiredPermissions": [
      "dashboard.view"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_dev_sce-icons-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_dev_sce-icons-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_dev_sce-icons-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_dev_sce-icons-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/events",
    "sourceFile": "app/(admin)/dashboard/events/page.tsx",
    "module": "events",
    "requiredPermissions": [
      "events.view"
    ],
    "testPersona": "Events workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/events/import",
    "sourceFile": "app/(admin)/dashboard/events/import/page.tsx",
    "module": "events",
    "requiredPermissions": [
      "events.view"
    ],
    "testPersona": "Events workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_import-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_import-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_import-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_import-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/events/matches/new",
    "sourceFile": "app/(admin)/dashboard/events/matches/new/page.tsx",
    "module": "events",
    "requiredPermissions": [
      "events.view"
    ],
    "testPersona": "Events workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_matches_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_matches_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_matches_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_matches_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/events/other/new",
    "sourceFile": "app/(admin)/dashboard/events/other/new/page.tsx",
    "module": "events",
    "requiredPermissions": [
      "events.view"
    ],
    "testPersona": "Events workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_other_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_other_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_other_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_other_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/events/tournaments/new",
    "sourceFile": "app/(admin)/dashboard/events/tournaments/new/page.tsx",
    "module": "tournaments",
    "requiredPermissions": [
      "tournaments.view"
    ],
    "testPersona": "Tournaments workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_tournaments_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_tournaments_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_tournaments_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_tournaments_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/events/trainings/new",
    "sourceFile": "app/(admin)/dashboard/events/trainings/new/page.tsx",
    "module": "events",
    "requiredPermissions": [
      "events.view"
    ],
    "testPersona": "Events workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_trainings_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_trainings_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_trainings_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_events_trainings_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/finance",
    "sourceFile": "app/(admin)/dashboard/finance/page.tsx",
    "module": "finance",
    "requiredPermissions": [
      "finance.view"
    ],
    "testPersona": "Finance workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/finance/actuals",
    "sourceFile": "app/(admin)/dashboard/finance/actuals/page.tsx",
    "module": "finance",
    "requiredPermissions": [
      "finance.view"
    ],
    "testPersona": "Finance workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_actuals-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_actuals-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_actuals-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_actuals-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/finance/budget",
    "sourceFile": "app/(admin)/dashboard/finance/budget/page.tsx",
    "module": "finance",
    "requiredPermissions": [
      "finance.view"
    ],
    "testPersona": "Finance workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_budget-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_budget-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_budget-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_budget-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/finance/commitments",
    "sourceFile": "app/(admin)/dashboard/finance/commitments/page.tsx",
    "module": "finance",
    "requiredPermissions": [
      "finance.view"
    ],
    "testPersona": "Finance workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_commitments-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_commitments-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_commitments-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_commitments-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/finance/commitments/approvals",
    "sourceFile": "app/(admin)/dashboard/finance/commitments/approvals/page.tsx",
    "module": "finance",
    "requiredPermissions": [
      "finance.view"
    ],
    "testPersona": "Finance workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_commitments_approvals-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_commitments_approvals-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_commitments_approvals-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_commitments_approvals-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/finance/forecast",
    "sourceFile": "app/(admin)/dashboard/finance/forecast/page.tsx",
    "module": "finance",
    "requiredPermissions": [
      "finance.view"
    ],
    "testPersona": "Finance workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_forecast-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_forecast-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_forecast-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_forecast-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/finance/forecast/scenarios",
    "sourceFile": "app/(admin)/dashboard/finance/forecast/scenarios/page.tsx",
    "module": "finance",
    "requiredPermissions": [
      "finance.view"
    ],
    "testPersona": "Finance workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_forecast_scenarios-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_forecast_scenarios-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_forecast_scenarios-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_forecast_scenarios-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/finance/forecast/scenarios/[scenarioId]",
    "sourceFile": "app/(admin)/dashboard/finance/forecast/scenarios/[scenarioId]/page.tsx",
    "module": "finance",
    "requiredPermissions": [
      "finance.view"
    ],
    "testPersona": "Finance workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_forecast_scenarios_cmvmount6000008lbd49bq5un-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_forecast_scenarios_cmvmount6000008lbd49bq5un-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_forecast_scenarios_cmvmount6000008lbd49bq5un-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_forecast_scenarios_cmvmount6000008lbd49bq5un-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/finance/forecast/timing",
    "sourceFile": "app/(admin)/dashboard/finance/forecast/timing/page.tsx",
    "module": "finance",
    "requiredPermissions": [
      "finance.view"
    ],
    "testPersona": "Finance workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_forecast_timing-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_forecast_timing-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_forecast_timing-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_forecast_timing-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/finance/publishing",
    "sourceFile": "app/(admin)/dashboard/finance/publishing/page.tsx",
    "module": "finance",
    "requiredPermissions": [
      "finance.view"
    ],
    "testPersona": "Finance workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_publishing-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_publishing-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_publishing-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_publishing-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/finance/reports",
    "sourceFile": "app/(admin)/dashboard/finance/reports/page.tsx",
    "module": "finance",
    "requiredPermissions": [
      "finance.view"
    ],
    "testPersona": "Finance workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_reports-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_reports-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_reports-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_reports-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/finance/settings",
    "sourceFile": "app/(admin)/dashboard/finance/settings/page.tsx",
    "module": "finance",
    "requiredPermissions": [
      "finance.view"
    ],
    "testPersona": "Finance workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_settings-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_settings-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_settings-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_settings-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/finance/structure",
    "sourceFile": "app/(admin)/dashboard/finance/structure/page.tsx",
    "module": "finance",
    "requiredPermissions": [
      "finance.view"
    ],
    "testPersona": "Finance workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_structure-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_structure-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_structure-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_finance_structure-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/formulare-freigaben",
    "sourceFile": "app/(admin)/dashboard/formulare-freigaben/page.tsx",
    "module": "dashboard",
    "requiredPermissions": [
      "dashboard.view"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "future-module",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "NOT_APPLICABLE",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_formulare-freigaben-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_formulare-freigaben-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_formulare-freigaben-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_formulare-freigaben-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/helfereinsaetze",
    "sourceFile": "app/(admin)/dashboard/helfereinsaetze/page.tsx",
    "module": "dashboard",
    "requiredPermissions": [
      "dashboard.view"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "future-module",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "NOT_APPLICABLE",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_helfereinsaetze-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_helfereinsaetze-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_helfereinsaetze-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_helfereinsaetze-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/infoboard",
    "sourceFile": "app/(admin)/dashboard/infoboard/page.tsx",
    "module": "infoboard",
    "requiredPermissions": [
      "infoboard.view"
    ],
    "testPersona": "Infoboard designer",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_infoboard-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_infoboard-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_infoboard-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_infoboard-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/infoboard/[id]",
    "sourceFile": "app/(admin)/dashboard/infoboard/[id]/page.tsx",
    "module": "infoboard",
    "requiredPermissions": [
      "infoboard.view"
    ],
    "testPersona": "Infoboard designer",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_infoboard_cmsqf2e7q0000iijsewcc1n37-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_infoboard_cmsqf2e7q0000iijsewcc1n37-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_infoboard_cmsqf2e7q0000iijsewcc1n37-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_infoboard_cmsqf2e7q0000iijsewcc1n37-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/infoboard/preview",
    "sourceFile": "app/(admin)/dashboard/infoboard/preview/page.tsx",
    "module": "infoboard",
    "requiredPermissions": [
      "infoboard.view"
    ],
    "testPersona": "Infoboard designer",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_infoboard_preview-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_infoboard_preview-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_infoboard_preview-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_infoboard_preview-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/kalender",
    "sourceFile": "app/(admin)/dashboard/kalender/page.tsx",
    "module": "wochenplaner",
    "requiredPermissions": [
      "planning.allocations.view"
    ],
    "testPersona": "Planning allocations viewer",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_kalender-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_kalender-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_kalender-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_kalender-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/logs",
    "sourceFile": "app/(admin)/dashboard/logs/page.tsx",
    "module": "dashboard",
    "requiredPermissions": [
      "dashboard.view"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_logs-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_logs-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_logs-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_logs-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/matchcenter",
    "sourceFile": "app/(admin)/dashboard/matchcenter/page.tsx",
    "module": "matches",
    "requiredPermissions": [
      "matches.view"
    ],
    "testPersona": "Matchcenter operator",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_matchcenter-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_matchcenter-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_matchcenter-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_matchcenter-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/matchcenter/[matchId]",
    "sourceFile": "app/(admin)/dashboard/matchcenter/[matchId]/page.tsx",
    "module": "matches",
    "requiredPermissions": [
      "matches.view"
    ],
    "testPersona": "Matchcenter operator",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_matchcenter_cmw72jaan009u08l83zagrrhc-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_matchcenter_cmw72jaan009u08l83zagrrhc-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_matchcenter_cmw72jaan009u08l83zagrrhc-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_matchcenter_cmw72jaan009u08l83zagrrhc-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/matchcenter/new",
    "sourceFile": "app/(admin)/dashboard/matchcenter/new/page.tsx",
    "module": "matches",
    "requiredPermissions": [
      "matches.view"
    ],
    "testPersona": "Matchcenter operator",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_matchcenter_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_matchcenter_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_matchcenter_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_matchcenter_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/mein-programm",
    "sourceFile": "app/(admin)/dashboard/mein-programm/page.tsx",
    "module": "dashboard",
    "requiredPermissions": [
      "dashboard.view"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_mein-programm-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_mein-programm-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_mein-programm-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_mein-programm-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/mitglieder",
    "sourceFile": "app/(admin)/dashboard/mitglieder/page.tsx",
    "module": "dashboard",
    "requiredPermissions": [
      "dashboard.view"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "future-module",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "NOT_APPLICABLE",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_mitglieder-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_mitglieder-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_mitglieder-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_mitglieder-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/notifications",
    "sourceFile": "app/(admin)/dashboard/notifications/page.tsx",
    "module": "communication",
    "requiredPermissions": [
      "communication.view"
    ],
    "testPersona": "Communication workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_notifications-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_notifications-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_notifications-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_notifications-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/org-units",
    "sourceFile": "app/(admin)/dashboard/org-units/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/org-units/[id]",
    "sourceFile": "app/(admin)/dashboard/org-units/[id]/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units_cmq822v4r000oejjsuiwkpwsa-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units_cmq822v4r000oejjsuiwkpwsa-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units_cmq822v4r000oejjsuiwkpwsa-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units_cmq822v4r000oejjsuiwkpwsa-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/org-units/[id]/edit",
    "sourceFile": "app/(admin)/dashboard/org-units/[id]/edit/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units_cmq822v4r000oejjsuiwkpwsa_edit-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units_cmq822v4r000oejjsuiwkpwsa_edit-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units_cmq822v4r000oejjsuiwkpwsa_edit-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units_cmq822v4r000oejjsuiwkpwsa_edit-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/org-units/[id]/history",
    "sourceFile": "app/(admin)/dashboard/org-units/[id]/history/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units_cmq822v4r000oejjsuiwkpwsa_history-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units_cmq822v4r000oejjsuiwkpwsa_history-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units_cmq822v4r000oejjsuiwkpwsa_history-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units_cmq822v4r000oejjsuiwkpwsa_history-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/org-units/new",
    "sourceFile": "app/(admin)/dashboard/org-units/new/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_org-units_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/permissions",
    "sourceFile": "app/(admin)/dashboard/permissions/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_permissions-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_permissions-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_permissions-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_permissions-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/persons",
    "sourceFile": "app/(admin)/dashboard/persons/page.tsx",
    "module": "persons",
    "requiredPermissions": [
      "people.view"
    ],
    "testPersona": "People & access administrator",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/persons/[id]",
    "sourceFile": "app/(admin)/dashboard/persons/[id]/page.tsx",
    "module": "persons",
    "requiredPermissions": [
      "people.view"
    ],
    "testPersona": "People & access administrator",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons_cmuo26ofc000004l6l5ousho7-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons_cmuo26ofc000004l6l5ousho7-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons_cmuo26ofc000004l6l5ousho7-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons_cmuo26ofc000004l6l5ousho7-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/persons/[id]/edit",
    "sourceFile": "app/(admin)/dashboard/persons/[id]/edit/page.tsx",
    "module": "persons",
    "requiredPermissions": [
      "people.view"
    ],
    "testPersona": "People & access administrator",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons_cmuo26ofc000004l6l5ousho7_edit-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons_cmuo26ofc000004l6l5ousho7_edit-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons_cmuo26ofc000004l6l5ousho7_edit-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons_cmuo26ofc000004l6l5ousho7_edit-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/persons/new",
    "sourceFile": "app/(admin)/dashboard/persons/new/page.tsx",
    "module": "persons",
    "requiredPermissions": [
      "people.view"
    ],
    "testPersona": "People & access administrator",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/persons/settings/development-criteria",
    "sourceFile": "app/(admin)/dashboard/persons/settings/development-criteria/page.tsx",
    "module": "persons",
    "requiredPermissions": [
      "people.view"
    ],
    "testPersona": "People & access administrator",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons_settings_development-criteria-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons_settings_development-criteria-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons_settings_development-criteria-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_persons_settings_development-criteria-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/planner/day",
    "sourceFile": "app/(admin)/dashboard/planner/day/page.tsx",
    "module": "wochenplaner",
    "requiredPermissions": [
      "planning.allocations.view"
    ],
    "testPersona": "Planning allocations viewer",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_planner_day-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_planner_day-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_planner_day-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_planner_day-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/planner/edit/[eventId]",
    "sourceFile": "app/(admin)/dashboard/planner/edit/[eventId]/page.tsx",
    "module": "wochenplaner",
    "requiredPermissions": [
      "planning.allocations.view"
    ],
    "testPersona": "Planning allocations viewer",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_planner_edit_cmw72jaan009u08l83zagrrhc-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_planner_edit_cmw72jaan009u08l83zagrrhc-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_planner_edit_cmw72jaan009u08l83zagrrhc-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_planner_edit_cmw72jaan009u08l83zagrrhc-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/planner/new",
    "sourceFile": "app/(admin)/dashboard/planner/new/page.tsx",
    "module": "wochenplaner",
    "requiredPermissions": [
      "planning.allocations.view"
    ],
    "testPersona": "Planning allocations viewer",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_planner_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_planner_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_planner_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_planner_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/planner/week",
    "sourceFile": "app/(admin)/dashboard/planner/week/page.tsx",
    "module": "wochenplaner",
    "requiredPermissions": [
      "planning.allocations.view"
    ],
    "testPersona": "Planning allocations viewer",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_planner_week-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_planner_week-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_planner_week-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_planner_week-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/platform",
    "sourceFile": "app/(admin)/dashboard/platform/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_platform-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_platform-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_platform-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_platform-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/players",
    "sourceFile": "app/(admin)/dashboard/players/page.tsx",
    "module": "dashboard",
    "requiredPermissions": [
      "dashboard.view"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_players-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_players-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_players-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_players-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/programm",
    "sourceFile": "app/(admin)/dashboard/programm/page.tsx",
    "module": "dashboard",
    "requiredPermissions": [
      "dashboard.view"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_programm-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_programm-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_programm-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_programm-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/roles",
    "sourceFile": "app/(admin)/dashboard/roles/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_roles-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_roles-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_roles-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_roles-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/roles/[id]",
    "sourceFile": "app/(admin)/dashboard/roles/[id]/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_roles_cmuo3h0bt000104ib3v2p4fj3-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_roles_cmuo3h0bt000104ib3v2p4fj3-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_roles_cmuo3h0bt000104ib3v2p4fj3-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_roles_cmuo3h0bt000104ib3v2p4fj3-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/runtime",
    "sourceFile": "app/(admin)/dashboard/runtime/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_runtime-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_runtime-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_runtime-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_runtime-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/seasons",
    "sourceFile": "app/(admin)/dashboard/seasons/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_seasons-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_seasons-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_seasons-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_seasons-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/seasons/planner",
    "sourceFile": "app/(admin)/dashboard/seasons/planner/page.tsx",
    "module": "wochenplaner",
    "requiredPermissions": [
      "planning.allocations.view"
    ],
    "testPersona": "Planning allocations viewer",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_seasons_planner-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_seasons_planner-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_seasons_planner-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_seasons_planner-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/sponsoring",
    "sourceFile": "app/(admin)/dashboard/sponsoring/page.tsx",
    "module": "dashboard",
    "requiredPermissions": [
      "dashboard.view"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_sponsoring-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_sponsoring-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_sponsoring-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_sponsoring-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/teams",
    "sourceFile": "app/(admin)/dashboard/teams/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/teams/[teamId]",
    "sourceFile": "app/(admin)/dashboard/teams/[teamId]/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/teams/[teamId]/administration",
    "sourceFile": "app/(admin)/dashboard/teams/[teamId]/administration/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_administration-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_administration-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_administration-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_administration-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/teams/[teamId]/anwesenheit",
    "sourceFile": "app/(admin)/dashboard/teams/[teamId]/anwesenheit/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_anwesenheit-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_anwesenheit-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_anwesenheit-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_anwesenheit-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/teams/[teamId]/dokumente",
    "sourceFile": "app/(admin)/dashboard/teams/[teamId]/dokumente/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_dokumente-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_dokumente-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_dokumente-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_dokumente-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/teams/[teamId]/kader",
    "sourceFile": "app/(admin)/dashboard/teams/[teamId]/kader/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_kader-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_kader-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_kader-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_kader-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/teams/[teamId]/kommunikation",
    "sourceFile": "app/(admin)/dashboard/teams/[teamId]/kommunikation/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_kommunikation-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_kommunikation-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_kommunikation-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_kommunikation-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/teams/[teamId]/programm",
    "sourceFile": "app/(admin)/dashboard/teams/[teamId]/programm/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_programm-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_programm-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_programm-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_programm-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/teams/[teamId]/rangliste",
    "sourceFile": "app/(admin)/dashboard/teams/[teamId]/rangliste/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_rangliste-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_rangliste-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_rangliste-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_rangliste-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/teams/[teamId]/resultate",
    "sourceFile": "app/(admin)/dashboard/teams/[teamId]/resultate/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_resultate-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_resultate-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_resultate-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_resultate-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/teams/[teamId]/spiele",
    "sourceFile": "app/(admin)/dashboard/teams/[teamId]/spiele/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_spiele-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_spiele-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_spiele-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_spiele-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/teams/[teamId]/teilnahmen",
    "sourceFile": "app/(admin)/dashboard/teams/[teamId]/teilnahmen/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_teilnahmen-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_teilnahmen-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_teilnahmen-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_teilnahmen-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/teams/[teamId]/trainerteam",
    "sourceFile": "app/(admin)/dashboard/teams/[teamId]/trainerteam/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_trainerteam-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_trainerteam-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_trainerteam-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_cmq822sd50000ejjsbl32btzg_trainerteam-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/teams/provider-mapping",
    "sourceFile": "app/(admin)/dashboard/teams/provider-mapping/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_provider-mapping-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_provider-mapping-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_provider-mapping-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_provider-mapping-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/teams/provider-mapping/[teamSeasonId]",
    "sourceFile": "app/(admin)/dashboard/teams/provider-mapping/[teamSeasonId]/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_provider-mapping_cmso8772p000504joyw9uh1g2-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_provider-mapping_cmso8772p000504joyw9uh1g2-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_provider-mapping_cmso8772p000504joyw9uh1g2-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_provider-mapping_cmso8772p000504joyw9uh1g2-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/teams/provider-mapping/mapping/[mappingId]",
    "sourceFile": "app/(admin)/dashboard/teams/provider-mapping/mapping/[mappingId]/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_provider-mapping_mapping_cmrkh1m0m000h04jua0waedrm-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_provider-mapping_mapping_cmrkh1m0m000h04jua0waedrm-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_provider-mapping_mapping_cmrkh1m0m000h04jua0waedrm-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_provider-mapping_mapping_cmrkh1m0m000h04jua0waedrm-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/teams/register",
    "sourceFile": "app/(admin)/dashboard/teams/register/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_register-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_register-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_register-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_teams_register-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/tournamentcenter",
    "sourceFile": "app/(admin)/dashboard/tournamentcenter/page.tsx",
    "module": "tournaments",
    "requiredPermissions": [
      "tournaments.view"
    ],
    "testPersona": "Tournaments workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_tournamentcenter-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_tournamentcenter-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_tournamentcenter-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_tournamentcenter-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/tournamentcenter/[tournamentId]/edit",
    "sourceFile": "app/(admin)/dashboard/tournamentcenter/[tournamentId]/edit/page.tsx",
    "module": "tournaments",
    "requiredPermissions": [
      "tournaments.view"
    ],
    "testPersona": "Tournaments workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_tournamentcenter_cmw8wxtzk000007l8lkuc5avu_edit-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_tournamentcenter_cmw8wxtzk000007l8lkuc5avu_edit-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_tournamentcenter_cmw8wxtzk000007l8lkuc5avu_edit-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_tournamentcenter_cmw8wxtzk000007l8lkuc5avu_edit-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/tournamentcenter/new",
    "sourceFile": "app/(admin)/dashboard/tournamentcenter/new/page.tsx",
    "module": "tournaments",
    "requiredPermissions": [
      "tournaments.view"
    ],
    "testPersona": "Tournaments workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_tournamentcenter_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_tournamentcenter_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_tournamentcenter_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_tournamentcenter_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/trainer-staff",
    "sourceFile": "app/(admin)/dashboard/trainer-staff/page.tsx",
    "module": "dashboard",
    "requiredPermissions": [
      "dashboard.view"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "future-module",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "NOT_APPLICABLE",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_trainer-staff-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_trainer-staff-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_trainer-staff-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_trainer-staff-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/trainers",
    "sourceFile": "app/(admin)/dashboard/trainers/page.tsx",
    "module": "dashboard",
    "requiredPermissions": [
      "dashboard.view"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_trainers-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_trainers-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_trainers-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_trainers-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/training",
    "sourceFile": "app/(admin)/dashboard/training/page.tsx",
    "module": "training",
    "requiredPermissions": [
      "training.view"
    ],
    "testPersona": "Training workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/training/new",
    "sourceFile": "app/(admin)/dashboard/training/new/page.tsx",
    "module": "training",
    "requiredPermissions": [
      "training.view"
    ],
    "testPersona": "Training workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/training/series/[seriesId]/allocations",
    "sourceFile": "app/(admin)/dashboard/training/series/[seriesId]/allocations/page.tsx",
    "module": "training",
    "requiredPermissions": [
      "training.view"
    ],
    "testPersona": "Training workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training_series_cmsp4t1oa000004jvytoux8ju_allocations-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training_series_cmsp4t1oa000004jvytoux8ju_allocations-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training_series_cmsp4t1oa000004jvytoux8ju_allocations-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training_series_cmsp4t1oa000004jvytoux8ju_allocations-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/training/series/[seriesId]/edit",
    "sourceFile": "app/(admin)/dashboard/training/series/[seriesId]/edit/page.tsx",
    "module": "training",
    "requiredPermissions": [
      "training.view"
    ],
    "testPersona": "Training workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training_series_cmsp4t1oa000004jvytoux8ju_edit-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training_series_cmsp4t1oa000004jvytoux8ju_edit-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training_series_cmsp4t1oa000004jvytoux8ju_edit-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training_series_cmsp4t1oa000004jvytoux8ju_edit-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/training/sessions/[sessionId]/edit",
    "sourceFile": "app/(admin)/dashboard/training/sessions/[sessionId]/edit/page.tsx",
    "module": "training",
    "requiredPermissions": [
      "training.view"
    ],
    "testPersona": "Training workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training_sessions_cmsp357it006i04jo8qlslonz_edit-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training_sessions_cmsp357it006i04jo8qlslonz_edit-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training_sessions_cmsp357it006i04jo8qlslonz_edit-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_training_sessions_cmsp357it006i04jo8qlslonz_edit-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/users",
    "sourceFile": "app/(admin)/dashboard/users/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_users-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_users-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_users-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_users-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/users/[userId]",
    "sourceFile": "app/(admin)/dashboard/users/[userId]/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_users_cmuo3i7kj000h04ibbahuwqyu-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_users_cmuo3i7kj000h04ibbahuwqyu-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_users_cmuo3i7kj000h04ibbahuwqyu-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_users_cmuo3i7kj000h04ibbahuwqyu-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/users/new",
    "sourceFile": "app/(admin)/dashboard/users/new/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "users.manage"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_users_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_users_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_users_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_users_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/veranstaltungen",
    "sourceFile": "app/(admin)/dashboard/veranstaltungen/page.tsx",
    "module": "events",
    "requiredPermissions": [
      "events.view"
    ],
    "testPersona": "Events workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_veranstaltungen-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_veranstaltungen-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_veranstaltungen-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_veranstaltungen-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/veranstaltungen/[eventId]/edit",
    "sourceFile": "app/(admin)/dashboard/veranstaltungen/[eventId]/edit/page.tsx",
    "module": "events",
    "requiredPermissions": [
      "events.view"
    ],
    "testPersona": "Events workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_veranstaltungen_cmw72jaan009u08l83zagrrhc_edit-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_veranstaltungen_cmw72jaan009u08l83zagrrhc_edit-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_veranstaltungen_cmw72jaan009u08l83zagrrhc_edit-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_veranstaltungen_cmw72jaan009u08l83zagrrhc_edit-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/veranstaltungen/freigaben",
    "sourceFile": "app/(admin)/dashboard/veranstaltungen/freigaben/page.tsx",
    "module": "events",
    "requiredPermissions": [
      "events.view"
    ],
    "testPersona": "Events workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_veranstaltungen_freigaben-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_veranstaltungen_freigaben-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_veranstaltungen_freigaben-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_veranstaltungen_freigaben-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/veranstaltungen/new",
    "sourceFile": "app/(admin)/dashboard/veranstaltungen/new/page.tsx",
    "module": "events",
    "requiredPermissions": [
      "events.view"
    ],
    "testPersona": "Events workspace editor",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_veranstaltungen_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_veranstaltungen_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_veranstaltungen_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_veranstaltungen_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/vereine",
    "sourceFile": "app/(admin)/dashboard/vereine/page.tsx",
    "module": "clubs",
    "requiredPermissions": [
      "clubs.view"
    ],
    "testPersona": "Club directory administrator",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/vereine/[clubId]",
    "sourceFile": "app/(admin)/dashboard/vereine/[clubId]/page.tsx",
    "module": "clubs",
    "requiredPermissions": [
      "clubs.view"
    ],
    "testPersona": "Club directory administrator",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_cmw93edip004608joy5g594t4-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_cmw93edip004608joy5g594t4-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_cmw93edip004608joy5g594t4-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_cmw93edip004608joy5g594t4-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/vereine/[clubId]/edit",
    "sourceFile": "app/(admin)/dashboard/vereine/[clubId]/edit/page.tsx",
    "module": "clubs",
    "requiredPermissions": [
      "clubs.view"
    ],
    "testPersona": "Club directory administrator",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_cmw93edip004608joy5g594t4_edit-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_cmw93edip004608joy5g594t4_edit-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_cmw93edip004608joy5g594t4_edit-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_cmw93edip004608joy5g594t4_edit-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/vereine/[clubId]/merge",
    "sourceFile": "app/(admin)/dashboard/vereine/[clubId]/merge/page.tsx",
    "module": "clubs",
    "requiredPermissions": [
      "clubs.view"
    ],
    "testPersona": "Club directory administrator",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_cmw93edip004608joy5g594t4_merge-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_cmw93edip004608joy5g594t4_merge-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_cmw93edip004608joy5g594t4_merge-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_cmw93edip004608joy5g594t4_merge-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/vereine/[clubId]/teams/new",
    "sourceFile": "app/(admin)/dashboard/vereine/[clubId]/teams/new/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_cmw93edip004608joy5g594t4_teams_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_cmw93edip004608joy5g594t4_teams_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_cmw93edip004608joy5g594t4_teams_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_cmw93edip004608joy5g594t4_teams_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/vereine/new",
    "sourceFile": "app/(admin)/dashboard/vereine/new/page.tsx",
    "module": "clubs",
    "requiredPermissions": [
      "clubs.view"
    ],
    "testPersona": "Club directory administrator",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/vereine/teams/[teamId]/edit",
    "sourceFile": "app/(admin)/dashboard/vereine/teams/[teamId]/edit/page.tsx",
    "module": "teams",
    "requiredPermissions": [
      "teams.view"
    ],
    "testPersona": "Teams workspace editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_teams_cmq822sd50000ejjsbl32btzg_edit-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_teams_cmq822sd50000ejjsbl32btzg_edit-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_teams_cmq822sd50000ejjsbl32btzg_edit-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vereine_teams_cmq822sd50000ejjsbl32btzg_edit-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/vorfaelle-disziplin",
    "sourceFile": "app/(admin)/dashboard/vorfaelle-disziplin/page.tsx",
    "module": "dashboard",
    "requiredPermissions": [
      "dashboard.view"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "future-module",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "NOT_APPLICABLE",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vorfaelle-disziplin-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vorfaelle-disziplin-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vorfaelle-disziplin-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_vorfaelle-disziplin-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website",
    "sourceFile": "app/(admin)/dashboard/website/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/blocks",
    "sourceFile": "app/(admin)/dashboard/website/blocks/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_blocks-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_blocks-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_blocks-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_blocks-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/components",
    "sourceFile": "app/(admin)/dashboard/website/components/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_components-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_components-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_components-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_components-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/components/[id]/edit",
    "sourceFile": "app/(admin)/dashboard/website/components/[id]/edit/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_components_cmr3f738400005ajswu1sszoq_edit-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_components_cmr3f738400005ajswu1sszoq_edit-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_components_cmr3f738400005ajswu1sszoq_edit-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_components_cmr3f738400005ajswu1sszoq_edit-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/components/new",
    "sourceFile": "app/(admin)/dashboard/website/components/new/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_components_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_components_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_components_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_components_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/design-system",
    "sourceFile": "app/(admin)/dashboard/website/design-system/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_design-system-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_design-system-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_design-system-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_design-system-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/editorial",
    "sourceFile": "app/(admin)/dashboard/website/editorial/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_editorial-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_editorial-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_editorial-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_editorial-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/homepage",
    "sourceFile": "app/(admin)/dashboard/website/homepage/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_homepage-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_homepage-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_homepage-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_homepage-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/media",
    "sourceFile": "app/(admin)/dashboard/website/media/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_media-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_media-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_media-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_media-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/navigation",
    "sourceFile": "app/(admin)/dashboard/website/navigation/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_navigation-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_navigation-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_navigation-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_navigation-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/news",
    "sourceFile": "app/(admin)/dashboard/website/news/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_news-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_news-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_news-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_news-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/news/[id]/edit",
    "sourceFile": "app/(admin)/dashboard/website/news/[id]/edit/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_news_sce-ds2-07g-vfy-news_edit-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_news_sce-ds2-07g-vfy-news_edit-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_news_sce-ds2-07g-vfy-news_edit-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_news_sce-ds2-07g-vfy-news_edit-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/news/new",
    "sourceFile": "app/(admin)/dashboard/website/news/new/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_news_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_news_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_news_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_news_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/pages",
    "sourceFile": "app/(admin)/dashboard/website/pages/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_pages-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_pages-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_pages-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_pages-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/pages/[id]/builder",
    "sourceFile": "app/(admin)/dashboard/website/pages/[id]/builder/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_pages_cmq41ifml0000fjjsgnx5tmbx_builder-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_pages_cmq41ifml0000fjjsgnx5tmbx_builder-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_pages_cmq41ifml0000fjjsgnx5tmbx_builder-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_pages_cmq41ifml0000fjjsgnx5tmbx_builder-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/pages/[id]/edit",
    "sourceFile": "app/(admin)/dashboard/website/pages/[id]/edit/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_pages_cmq41ifml0000fjjsgnx5tmbx_edit-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_pages_cmq41ifml0000fjjsgnx5tmbx_edit-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_pages_cmq41ifml0000fjjsgnx5tmbx_edit-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_pages_cmq41ifml0000fjjsgnx5tmbx_edit-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/pages/new",
    "sourceFile": "app/(admin)/dashboard/website/pages/new/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_pages_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_pages_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_pages_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_pages_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/publishing",
    "sourceFile": "app/(admin)/dashboard/website/publishing/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_publishing-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_publishing-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_publishing-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_publishing-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/review",
    "sourceFile": "app/(admin)/dashboard/website/review/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_review-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_review-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_review-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_review-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/website/settings",
    "sourceFile": "app/(admin)/dashboard/website/settings/page.tsx",
    "module": "website-cms",
    "requiredPermissions": [
      "website.cms.view"
    ],
    "testPersona": "Website CMS editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_settings-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_settings-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_settings-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_website_settings-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/wochenplan",
    "sourceFile": "app/(admin)/dashboard/wochenplan/page.tsx",
    "module": "wochenplaner",
    "requiredPermissions": [
      "planning.allocations.view"
    ],
    "testPersona": "Planning allocations viewer",
    "pageArchetype": "planning-activity",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_wochenplan-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_wochenplan-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_wochenplan-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_wochenplan-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/workspace",
    "sourceFile": "app/(admin)/dashboard/workspace/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_workspace-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_workspace-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_workspace-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_workspace-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/workspace/audit",
    "sourceFile": "app/(admin)/dashboard/workspace/audit/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_workspace_audit-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_workspace_audit-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_workspace_audit-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_workspace_audit-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/dashboard/workspace/governance/break-glass",
    "sourceFile": "app/(admin)/dashboard/workspace/governance/break-glass/page.tsx",
    "module": "administration",
    "requiredPermissions": [
      "admin.access"
    ],
    "testPersona": "FCA club admin (it@fcallschwil.ch)",
    "pageArchetype": "workspace-hub",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_workspace_governance_break-glass-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_workspace_governance_break-glass-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_workspace_governance_break-glass-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_dashboard_workspace_governance_break-glass-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/tenant/[tenantSlug]/cockpit/registrations",
    "sourceFile": "app/(admin)/tenant/[tenantSlug]/cockpit/registrations/page.tsx",
    "module": "tenant-admin",
    "requiredPermissions": [
      "platform.admin"
    ],
    "testPersona": "Platform superadmin (hello@tulip-digital.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_tenant_fc-allschwil_cockpit_registrations-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_tenant_fc-allschwil_cockpit_registrations-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_tenant_fc-allschwil_cockpit_registrations-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_tenant_fc-allschwil_cockpit_registrations-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/tenant/[tenantSlug]/cockpit/registrations/[registrationId]",
    "sourceFile": "app/(admin)/tenant/[tenantSlug]/cockpit/registrations/[registrationId]/page.tsx",
    "module": "tenant-admin",
    "requiredPermissions": [
      "platform.admin"
    ],
    "testPersona": "Platform superadmin (hello@tulip-digital.ch)",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_tenant_fc-allschwil_cockpit_registrations_cmwb0bybl000208l3t6hw36pr-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_tenant_fc-allschwil_cockpit_registrations_cmwb0bybl000208l3t6hw36pr-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_tenant_fc-allschwil_cockpit_registrations_cmwb0bybl000208l3t6hw36pr-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_tenant_fc-allschwil_cockpit_registrations_cmwb0bybl000208l3t6hw36pr-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/tenant/[tenantSlug]/cockpit/registrations/archiv",
    "sourceFile": "app/(admin)/tenant/[tenantSlug]/cockpit/registrations/archiv/page.tsx",
    "module": "tenant-admin",
    "requiredPermissions": [
      "platform.admin"
    ],
    "testPersona": "Platform superadmin (hello@tulip-digital.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_tenant_fc-allschwil_cockpit_registrations_archiv-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_tenant_fc-allschwil_cockpit_registrations_archiv-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_tenant_fc-allschwil_cockpit_registrations_archiv-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_tenant_fc-allschwil_cockpit_registrations_archiv-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/tenant/[tenantSlug]/cockpit/registrations/warteliste",
    "sourceFile": "app/(admin)/tenant/[tenantSlug]/cockpit/registrations/warteliste/page.tsx",
    "module": "tenant-admin",
    "requiredPermissions": [
      "platform.admin"
    ],
    "testPersona": "Platform superadmin (hello@tulip-digital.ch)",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_tenant_fc-allschwil_cockpit_registrations_warteliste-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_tenant_fc-allschwil_cockpit_registrations_warteliste-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_tenant_fc-allschwil_cockpit_registrations_warteliste-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_tenant_fc-allschwil_cockpit_registrations_warteliste-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung",
    "sourceFile": "app/(admin)/vereinsleitung/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/club-entwicklung",
    "sourceFile": "app/(admin)/vereinsleitung/club-entwicklung/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_club-entwicklung-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_club-entwicklung-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_club-entwicklung-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_club-entwicklung-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/finanzen/rechnungen",
    "sourceFile": "app/(admin)/vereinsleitung/finanzen/rechnungen/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_finanzen_rechnungen-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_finanzen_rechnungen-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_finanzen_rechnungen-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_finanzen_rechnungen-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/initiativen",
    "sourceFile": "app/(admin)/vereinsleitung/initiativen/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_initiativen-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_initiativen-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_initiativen-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_initiativen-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/initiativen/[slug]",
    "sourceFile": "app/(admin)/vereinsleitung/initiativen/[slug]/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_initiativen_ds2-07g-verification-initiative-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_initiativen_ds2-07g-verification-initiative-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_initiativen_ds2-07g-verification-initiative-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_initiativen_ds2-07g-verification-initiative-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/initiativen/[slug]/edit",
    "sourceFile": "app/(admin)/vereinsleitung/initiativen/[slug]/edit/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_initiativen_edit-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_initiativen_edit-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_initiativen_edit-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_initiativen_edit-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/initiativen/new",
    "sourceFile": "app/(admin)/vereinsleitung/initiativen/new/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_initiativen_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_initiativen_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_initiativen_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_initiativen_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/kpis",
    "sourceFile": "app/(admin)/vereinsleitung/kpis/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_kpis-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_kpis-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_kpis-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_kpis-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/material",
    "sourceFile": "app/(admin)/vereinsleitung/material/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_material-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_material-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_material-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_material-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/meetings",
    "sourceFile": "app/(admin)/vereinsleitung/meetings/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_meetings-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_meetings-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_meetings-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_meetings-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/meetings/[slug]",
    "sourceFile": "app/(admin)/vereinsleitung/meetings/[slug]/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_meetings_ds2-07g-verification-meeting-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_meetings_ds2-07g-verification-meeting-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_meetings_ds2-07g-verification-meeting-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_meetings_ds2-07g-verification-meeting-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/meetings/[slug]/edit",
    "sourceFile": "app/(admin)/vereinsleitung/meetings/[slug]/edit/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_meetings_ds2-07g-verification-meeting_edit-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_meetings_ds2-07g-verification-meeting_edit-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_meetings_ds2-07g-verification-meeting_edit-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_meetings_ds2-07g-verification-meeting_edit-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/meetings/new",
    "sourceFile": "app/(admin)/vereinsleitung/meetings/new/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_meetings_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_meetings_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_meetings_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_meetings_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/prozesse",
    "sourceFile": "app/(admin)/vereinsleitung/prozesse/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_prozesse-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_prozesse-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_prozesse-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_prozesse-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/prozesse/[slug]",
    "sourceFile": "app/(admin)/vereinsleitung/prozesse/[slug]/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/prozesse/[slug]/edit",
    "sourceFile": "app/(admin)/vereinsleitung/prozesse/[slug]/edit/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/prozesse/new",
    "sourceFile": "app/(admin)/vereinsleitung/prozesse/new/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/targets",
    "sourceFile": "app/(admin)/vereinsleitung/targets/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_targets-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_targets-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_targets-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_targets-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/targets/[id]",
    "sourceFile": "app/(admin)/vereinsleitung/targets/[id]/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_targets_sce-ds2-07g-vfy-target-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_targets_sce-ds2-07g-vfy-target-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_targets_sce-ds2-07g-vfy-target-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_targets_sce-ds2-07g-vfy-target-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/targets/[id]/edit",
    "sourceFile": "app/(admin)/vereinsleitung/targets/[id]/edit/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_targets_sce-ds2-07g-vfy-target_edit-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_targets_sce-ds2-07g-vfy-target_edit-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_targets_sce-ds2-07g-vfy-target_edit-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_targets_sce-ds2-07g-vfy-target_edit-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/targets/new",
    "sourceFile": "app/(admin)/vereinsleitung/targets/new/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_targets_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_targets_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_targets_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_targets_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/templates",
    "sourceFile": "app/(admin)/vereinsleitung/templates/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_templates-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_templates-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_templates-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_templates-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/templates/[id]",
    "sourceFile": "app/(admin)/vereinsleitung/templates/[id]/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "detail",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_templates_cmq822van000qejjsfd18vi6j-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_templates_cmq822van000qejjsfd18vi6j-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_templates_cmq822van000qejjsfd18vi6j-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_templates_cmq822van000qejjsfd18vi6j-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/templates/[id]/edit",
    "sourceFile": "app/(admin)/vereinsleitung/templates/[id]/edit/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_templates_cmq822van000qejjsfd18vi6j_edit-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_templates_cmq822van000qejjsfd18vi6j_edit-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_templates_cmq822van000qejjsfd18vi6j_edit-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_templates_cmq822van000qejjsfd18vi6j_edit-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/templates/new",
    "sourceFile": "app/(admin)/vereinsleitung/templates/new/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "form",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "VERIFIED",
    "compactDesktop": "VERIFIED",
    "tablet": "VERIFIED",
    "mobile": "VERIFIED",
    "accessibility": "PENDING",
    "functional": "VERIFIED",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_templates_new-desktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_templates_new-compactDesktop.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_templates_new-tablet.png",
      "/opt/cursor/artifacts/sce-ds2-07g/_vereinsleitung_templates_new-mobile.png"
    ],
    "defects": []
  },
  {
    "urlPattern": "/vereinsleitung/vorhaben",
    "sourceFile": "app/(admin)/vereinsleitung/vorhaben/page.tsx",
    "module": "vereinsleitung",
    "requiredPermissions": [
      "governance.view"
    ],
    "testPersona": "Vereinsleitung governance editor",
    "pageArchetype": "list",
    "intercept": false,
    "parallelSlot": null,
    "architectureAdoption": "IMPLEMENTED",
    "automatedChecks": "PASSED",
    "desktop": "PENDING",
    "compactDesktop": "PENDING",
    "tablet": "PENDING",
    "mobile": "PENDING",
    "accessibility": "PENDING",
    "functional": "PENDING",
    "authenticatedVisual": "PENDING",
    "evidenceReferences": [],
    "defects": []
  }
];

export const SCE_DS2_07G_VERIFICATION_SUMMARY: SceDs207gVerificationSummary = {
  "matrixVersion": "2026-11-11-batch-11",
  "evidenceContractVersion": "2026-11-11-batch-11",
  "generatedAt": "2026-11-12T16:30:50.188Z",
  "totalCanonicalRoutes": 218,
  "verifiedAuthenticatedVisualCount": 0,
  "pendingAuthenticatedVisualCount": 218,
  "blockedCount": 0,
  "automatedChecksPassedCount": 218,
  "highRiskBatchSize": 41,
  "highRiskVerifiedCount": 0,
  "highRiskResponsiveVerifiedCount": 41,
  "dimensionClosureCompleteCount": 0,
  "dimensionAccessibilityPassCount": 0,
  "dimensionFunctionalPassCount": 136,
  "authenticatedBrowserAvailable": true,
  "contrastSmokeDebt": [
    "vitest contrast smoke may time out during cold Playwright install; direct script passes (scripts/sce-ds2-06-visual-archetypes-browser-check.mjs)"
  ],
  "trackedBaselineDebt": [
    "Matchcenter operational panels (sce-design-system-10r2 migration debt)",
    "Infoboard designer live preview surfaces",
    "Aufgaben intercept modal routes",
    "Batch 3 evidence contract: responsive/auth from batch 2 preserved; visual/a11y/functional require independent proof"
  ]
};

export const SCE_DS2_07G_STATIC_AUDIT = {
  "entriesScanned": 218,
  "defects": []
};
