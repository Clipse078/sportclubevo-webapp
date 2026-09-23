/**
 * WORKSPACE-08-01 — append-only governance audit contract (application layer).
 *
 * APPEND_ONLY_APPLICATION_CONTRACT:
 *   Workspace governance audit rows are created via writeWorkspaceGovernanceAudit /
 *   writeAuditRecord only. No application API exposes update or delete on AuditLog
 *   for tenant admins, workspace managers, or operators.
 *
 * DB_PROTECTION:
 *   Phase 1 — application discipline + tests (W08-01). Optional INSERT-only DB role
 *   documented for ops (Phase 2, W08-08 acceptance).
 *
 * DBA_RESIDUAL_RISK:
 *   The application database owner can still UPDATE/DELETE AuditLog rows directly.
 *   Optional WORM export (W08-06) addresses long-term tamper evidence.
 */

export const WORKSPACE_AUDIT_APPEND_ONLY = {
  applicationContract:
    "INSERT-only via governance writers; no tenant-facing mutation API",
  dbProtection: "Phase 1 application enforcement; DB INSERT-only role deferred",
  dbaResidualRisk: "Direct DB owner mutation remains possible without WORM export",
  hashChain: "DEFERRED",
  wormArchive: "OPTIONAL_FUTURE_W08_06",
} as const;
