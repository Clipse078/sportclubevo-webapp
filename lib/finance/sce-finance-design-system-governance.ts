/**
 * FIN-01A — Finance inherits SCE Design System v1.0 governance (documentation contract).
 */

import { FINANCE_DESIGN_SYSTEM } from "./finance-architecture";

export const SCE_FINANCE_DESIGN_SYSTEM_GOVERNANCE = {
  ...FINANCE_DESIGN_SYSTEM,
  foundationModules: [
    "sce-workspace-hierarchy",
    "sce-context-tabs-foundation",
    "sce-dense-ui-foundation",
    "sce-form-control-foundation",
    "sce-action-dialog-foundation",
  ],
  financeSpecificVisualizationsAllowed: true,
} as const;
